import { FeatureRow } from "./../../../../../packages/event-processing/src/node-type-defs/lib/store";
import { db } from "databases";
import { FeatureDef, TSchema } from "event-processing";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getAnnotatedFeatures, getLatestFeatureDefs } from "../../lib/features";

export const featureDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  schema: z.record(z.unknown()),
  entityTypeId: z.string(),
});

export const eventFeatureDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  schema: z.record(z.unknown()),
});

export const featuresRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          entityTypeId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const result = await ctx.prisma.feature.findMany({
        where: {
          entityTypeId: input?.entityTypeId ?? undefined,
        },
      });

      const ret: FeatureDef[] = result.map((f) => {
        return {
          id: f.id,
          name: f.name,
          description: f.description ?? undefined,
          schema: f.schema as unknown as TSchema,
          entityTypeId: f.entityTypeId,
        };
      });

      return ret;
    }),
  create: protectedProcedure
    .input(featureDefSchema.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const feature = await ctx.prisma.feature.create({
        data: {
          name: input.name,
          schema: input.schema as any,
          entityTypeId: input.entityTypeId,
        },
      });

      return feature;
    }),

  createEventFeature: protectedProcedure
    .input(eventFeatureDefSchema.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const feature = await ctx.prisma.feature.create({
        data: {
          name: input.name,
          schema: input.schema,
        },
      });

      return feature;
    }),

  getFeatures: protectedProcedure
    .input(
      z.object({
        featureIds: z.array(z.string()),
        entityIds: z.array(z.string()),
      })
    )
    .query(async ({ ctx, input }) => {
      const { featureIds, entityIds } = input;

      const featureDefs = await getLatestFeatureDefs();
      const entityTypes = await ctx.prisma.entityType.findMany();

      const result = await db.query({
        query: `
          SELECT
              entity_type,
              entity_id,
              groupArray((latest_features.feature_id, latest_features.value, latest_features.error)) as features_array
          FROM (
              SELECT
                  entity_type,
                  entity_id,
                  feature_id,
                  value,
                  event_timestamp,
                  error,
                  row_number() OVER (PARTITION BY entity_id, feature_id ORDER BY event_timestamp DESC) as rn
              FROM features
              FINAL
              WHERE entity_id IN (${entityIds
                .map((id) => `['${id}']`)
                .join(",")}) and feature_id in (${featureIds
                .map((id) => `'${id}'`)
                .join(",")})
          ) AS latest_features
          WHERE latest_features.rn = 1
          GROUP BY entity_type, entity_id
        `,
        format: "JSONEachRow",
      });

      const entities = await result.json<
        {
          entity_type: [string];
          entity_id: [string];
          features_array: Array<[string, string | null, string | null]>;
        }[]
      >();

      return entities.map((entity) => {
        const entityId = entity.entity_id[0];
        return {
          entityId,
          entityType: entity.entity_type[0],
          features: getAnnotatedFeatures(
            featureDefs,
            entityTypes,
            entity.features_array
          ),
        };
      });
    }),

  getValue: protectedProcedure
    .input(
      z.object({
        featurePath: z.array(z.any()), // Specify the type more precisely
        entity: z.object({
          id: z.string(),
          type: z.string(),
        }),
      })
    )
    .query(async ({ ctx, input }) => {
      const { featurePath, entity } = input;

      // Start building the query
      let query = `SELECT f${featurePath.length}.feature_id as feature_id, f${featurePath.length}.value as value, f${featurePath.length}.error as error\n FROM features AS f1\n`;

      // Build JOIN clauses for featurePath
      for (let i = 1; i < featurePath.length; i++) {
        query += ` LEFT JOIN features AS f${i + 1} ON f${i}.entity_id = f${
          i + 1
        }.entity_id AND f${i}.feature_id = '${featurePath[i - 1].featureId}'\n`;
      }

      // Add WHERE, ORDER BY, and LIMIT clauses
      query += ` WHERE f1.entity_id = ['${entity.id}'] AND f1.entity_type = ['${entity.type}'] AND f1.feature_id = '${featurePath[0].featureId}'\n`;
      query += ` ORDER BY f${featurePath.length}.event_id DESC LIMIT 1\n`;

      // Execute the query
      const result = await db.query({
        query,
        format: "JSONEachRow",
      });
      const res = await result.json<
        {
          feature_id: string;
          value: string | null;
          error: string | null;
        }[]
      >();

      if (res.length !== 1) {
        throw new Error(
          `Expected exactly one feature result, got ${res.length}`
        );
      }

      const val = res[0]!;

      const featureDefs = await getLatestFeatureDefs();
      const entityTypes = await ctx.prisma.entityType.findMany();

      const featureResult = getAnnotatedFeatures(featureDefs, entityTypes, [
        [val.feature_id, val.value, val.error],
      ]);
      return featureResult[0]!;
    }),

  //   delete: protectedProcedure
  //     .input(z.object({ id: z.string() }))
  //     .mutation(async ({ ctx, input }) => {
  //       await ctx.prisma.listItem.deleteMany({
  //         where: {
  //           listId: input.id,
  //         },
  //       });

  //       return ctx.prisma.list.delete({
  //         where: {
  //           id: input.id,
  //         },
  //       });
  //     }),
  //   get: protectedProcedure
  //     .input(
  //       z.object({
  //         id: z.string(),
  //       })
  //     )
  //     .query(async ({ ctx, input }) => {
  //       return ctx.prisma.list.findUnique({
  //         where: {
  //           id: input.id,
  //         },
  //         include: {
  //           items: true,
  //         },
  //       });
  //     }),
});

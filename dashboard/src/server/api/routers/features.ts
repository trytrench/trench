import { db } from "databases";
import {
  FeatureDef,
  TSchema,
  featureDefSchema,
  tSchemaZod,
} from "event-processing";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getAnnotatedFeatures, getLatestFeatureDefs } from "../../lib/features";

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
          entityTypeId: f.entityTypeId ?? undefined,
          eventTypeId: f.eventTypeId ?? undefined,
          metadata: f.metadata,
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
          metadata: input.metadata,
        },
      });

      return feature;
    }),
  update: protectedProcedure
    .input(featureDefSchema.pick({ id: true, name: true, metadata: true }))
    .mutation(async ({ ctx, input }) => {
      const feature = await ctx.prisma.feature.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          metadata: input.metadata,
        },
      });

      return feature;
    }),

  createEventFeature: protectedProcedure
    .input(featureDefSchema.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const feature = await ctx.prisma.feature.create({
        data: {
          name: input.name,
          schema: input.schema as any,
          eventTypeId: input.eventTypeId,
          metadata: input.metadata,
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
              unique_entity_id,
              entity_type,
              entity_id,
              groupArray((feature_id, value)) as features_array
          FROM latest_entity_features_view
          WHERE unique_entity_id IN (${entityIds
            .map((id) => `'${id}'`)
            .join(",")})
          AND data_type = 'Name'
          GROUP BY unique_entity_id, entity_type, entity_id
          SETTINGS optimize_move_to_prewhere_if_final = 1
        `,
        format: "JSONEachRow",
      });

      const entities = await result.json<
        {
          entity_type: string;
          entity_id: string;
          features_array: Array<[string, string | null]>;
        }[]
      >();

      return entities.map((entity) => {
        return {
          entityId: entity.entity_id,
          entityType: entity.entity_type,
          features: getAnnotatedFeatures(
            featureDefs,
            entityTypes,
            entity.features_array.map(([featureId, value]) => [
              featureId,
              value,
              null,
            ])
          ),
        };
      });
    }),

  getValue: protectedProcedure
    .input(
      z.object({
        featurePath: z.array(z.string()), // Specify the type more precisely
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
        query += ` LEFT JOIN features AS f${
          i + 1
        } ON f${i}.data_type = 'Entity' AND simpleJSONExtractString(f${i}.value, 'id') = f${
          i + 1
        }.entity_id AND simpleJSONExtractString(f${i}.value, 'type') = f${
          i + 1
        }.entity_type AND f${i + 1}.feature_id = '${featurePath[i]}'\n`;
      }

      query += ` WHERE f1.entity_id = '${entity.id}' AND f1.entity_type = '${entity.type}' AND f1.feature_id = '${featurePath[0]}'\n`;
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

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rule = await ctx.prisma.rule.findFirst({
        where: {
          featureId: input.id,
        },
      });

      if (rule)
        await ctx.prisma.rule.delete({
          where: {
            featureId: input.id,
          },
        });

      return ctx.prisma.feature.delete({
        where: {
          id: input.id,
        },
      });
    }),
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

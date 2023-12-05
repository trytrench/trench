import { uniqBy } from "lodash";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getOrderedFeatures } from "~/server/lib/features";
import {
  entityFiltersZod,
  eventFiltersZod,
  findTopEntitiesArgs,
} from "../../../shared/validation";
import {
  buildEntityExistsQuery,
  buildEventExistsQuery,
} from "../../lib/filters";

export const entitiesRouter = createTRPCRouter({
  findIds: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.entity.findMany({
        where: {
          id: {
            in: input.ids,
          },
        },
      });
    }),

  getTimeBuckets: protectedProcedure
    .input(
      z.object({
        interval: z.number(),
        start: z.number(),
        end: z.number(),
        eventFilters: eventFiltersZod,
        entityFilters: entityFiltersZod,
      })
    )
    .query(async ({ ctx, input }) => {
      // Convert milliseconds to seconds
      const startInSeconds = Math.ceil(input.start / 1000);
      const endInSeconds = Math.ceil(input.end / 1000);
      const intervalInSeconds = Math.ceil(input.interval / 1000);

      const bucketsFromDB = await ctx.prisma.$queryRawUnsafe<
        Array<{
          bucket: Date;
          label: string;
          labelColor: string;
          count: number;
        }>
      >(`
      WITH RECURSIVE TimeBucketTable(bucket) AS (
          SELECT to_timestamp(${startInSeconds}) AS bucket
          UNION ALL
          SELECT bucket + INTERVAL '1 second' * ${intervalInSeconds}
          FROM TimeBucketTable
          WHERE bucket < to_timestamp(${endInSeconds})
      ),
      entities AS (
        SELECT 
          "EventToEntityLink"."entityId",
          "Event"."timestamp"
        FROM "EventToEntityLink"
        JOIN "Event" ON "EventToEntityLink"."eventId" = "Event"."id"
        WHERE
          ${buildEntityExistsQuery(
            input.entityFilters,
            '"EventToEntityLink"."entityId"'
          )}
          AND EXISTS (
            SELECT FROM "Event" 
            WHERE 
            ("Event"."id" = "EventToEntityLink"."eventId"
            AND ${buildEventExistsQuery(
              input.eventFilters
            )}) OR "Event"."timestamp" IS NULL
          )
      )
      SELECT
          tb.bucket AS bucket,
          "EntityLabel"."name" AS "label",
          "EntityLabel"."color" AS "labelColor",
          COUNT(DISTINCT entities."entityId") AS count
      FROM
          TimeBucketTable AS tb
      LEFT JOIN entities
          ON
          entities."timestamp" >= tb.bucket AND
          entities."timestamp" < tb.bucket + INTERVAL '1 second' * ${intervalInSeconds}
      LEFT JOIN "_EntityToEntityLabel"
          ON "_EntityToEntityLabel"."A" = entities."entityId"
      LEFT JOIN "EntityLabel"
          ON "EntityLabel"."id" = "_EntityToEntityLabel"."B"
      GROUP BY
          tb.bucket, "EntityLabel"."name", "EntityLabel"."color"
      ORDER BY
          tb.bucket;
      `);

      type Result = {
        bucket: number;
        counts: Record<string, number>;
      };
      const results: Array<Result> = [];

      const allLabels = new Set<string>();
      for (const row of bucketsFromDB) {
        if (row.label) allLabels.add(row.label);
      }

      for (const row of bucketsFromDB) {
        const bucket = row.bucket;
        const label = row.label;
        const count = Number(row.count);

        const bucketResult = results.find((r) => r.bucket === bucket.getTime());

        if (bucketResult) {
          bucketResult.counts[label] = count;
          bucketResult.counts.Total += count;
        } else {
          const newObj: Result = {
            bucket: bucket.getTime(),
            counts: {},
          };

          for (const label of allLabels) {
            newObj.counts[label] = 0;
          }

          newObj.counts.Total = count;
          newObj.counts[label] = count;

          results.push(newObj);
        }
      }

      const labels = Array.from(allLabels).map((label) => ({
        label,
        color:
          bucketsFromDB.find((row) => row.label === label)?.labelColor ||
          "gray",
      }));

      return {
        data: results
          .map((bucket) => ({
            ...bucket,
            bucket: new Date(bucket.bucket),
          }))
          .slice(0, -1),
        labels: [{ label: "Total", color: "blue" }, ...labels],
      };
    }),

  findTop: protectedProcedure
    .input(findTopEntitiesArgs)
    .query(async ({ ctx, input }) => {
      const topEntities = await ctx.prisma.$queryRawUnsafe<
        Array<{
          id: string;
          type: string;
          name: string;
          count: number;
          entityLabels: Array<{
            name: string;
            color: string;
          }>;
        }>
      >(`
        WITH links AS (
          SELECT 
            "EventToEntityLink"."entityId",
            "EventToEntityLink"."eventId"
          FROM "EventToEntityLink"
          WHERE 1 = 1
          ${
            input.linkType
              ? `AND "EventToEntityLink"."type" = '${input.linkType}'`
              : ""
          }
          AND ${buildEventExistsQuery(
            input.eventFilters,
            '"EventToEntityLink"."eventId"'
          )}
        ),
        rows AS (
          SELECT 
            "links"."entityId" AS "id",
            COUNT(*) AS "count"
          FROM "links"
          GROUP BY "links"."entityId"
          ORDER BY COUNT(*) DESC
        ),
        entities AS (
          SELECT
            "rows"."id",
            "count"
          FROM "rows"
          WHERE ${buildEntityExistsQuery(input.entityFilters, '"rows"."id"')}
        )
        SELECT
          "Entity"."id",
          "Entity"."type",
          "Entity"."name",
          "entities"."count",
          ARRAY_AGG(
            json_build_object('name', "EntityLabel"."name", 'color', "EntityLabel"."color")
          ) AS "entityLabels"
        FROM "entities"
        JOIN "Entity" ON "Entity"."id" = "entities"."id"
        LEFT JOIN "_EntityToEntityLabel" ON "Entity"."id" = "_EntityToEntityLabel"."A"
        LEFT JOIN "EntityLabel" ON "_EntityToEntityLabel"."B" = "EntityLabel"."id"
        GROUP BY "Entity"."id", "Entity"."type", "Entity"."name", "entities"."count"
        ORDER BY "entities"."count" DESC
        LIMIT ${input.limit ?? 5}
      `);

      const ret = topEntities.map((entity) => ({
        ...entity,
        count: Number(entity.count),
        entityLabels: entity.entityLabels.filter((label) => !!label.name),
      }));

      return ret;
    }),
  findMany: protectedProcedure
    .input(
      z.object({
        offset: z.number().optional(),
        limit: z.number().optional(),
        filters: z
          .object({
            type: z.string().optional(),
          })
          .optional(),
        orderBy: z
          .object({
            eventsCount: z.enum(["asc", "desc"]).optional(),
          })
          .optional(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.entity.findMany({
        include: {
          entityLabels: true,
        },
        where: {
          type: input.filters?.type,
        },
        skip: input.offset,
        take: input.limit,
        orderBy: {
          eventLinks: {
            _count: input.orderBy?.eventsCount,
          },
        },
      });
    }),

  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const features = await ctx.prisma.feature.findMany();
      const entityTypes = await ctx.prisma.entityType.findMany({
        include: {
          nameFeature: {
            include: {
              feature: true,
            },
          },
        },
      });
      const entityFeatures = await ctx.prisma.entityFeature.findMany({
        include: {
          entityType: true,
          feature: true,
        },
      });

      const result = await db.query({
        query: `
          SELECT 
            entity_id as id,
            entity_type as type,
            max(event_timestamp) AS lastSeenAt,
            ${features
              .map(
                (feature) =>
                  `argMaxIf(JSONExtractString(features, '${feature.feature}'), event_timestamp, JSONExtractString(features, '${feature.feature}') IS NOT NULL) AS ${feature.feature}\n`
              )
              .join(",")}
          FROM event_entity
          WHERE id = '${input.id}'
            AND dataset_id = '${input.datasetId}'
          GROUP BY entity_id, entity_type;
        `,
        format: "JSONEachRow",
      });

      const [entity] = await result.json<
        (Record<string, string> & {
          id: string;
          type: string;
          lastSeenAt: string;
        })[]
      >();

      if (!entity) throw new Error("Entity not found");

      const nameFeatures = uniqBy(
        entityTypes.map((type) => type.nameFeature?.feature).filter(Boolean),
        (feature) => feature?.feature
      );

      const entityFeatureNames = features
        .filter((feature) => feature.dataType === "entity")
        .map((feature) => feature.feature);

      const entityIds = [entity.id];
      for (const [feature, value] of Object.entries(entity)) {
        if (value && entityFeatureNames.includes(feature)) {
          entityIds.push(value);
        }
      }

      const data = await db.query({
        query: `
          SELECT 
            entity_id as id,
            entity_type as type
            ${nameFeatures
              .map(
                (feature) =>
                  `,argMaxIf(JSONExtractString(features, '${feature?.feature}'), event_timestamp, JSONExtractString(features, '${feature?.feature}') IS NOT NULL) AS ${feature.feature}`
              )
              .join("")}
          FROM event_entity
          WHERE dataset_id = '${input.datasetId}'
          ${
            entityIds.length
              ? `AND entity_id IN (${entityIds
                  .map((id) => `'${id}'`)
                  .join(",")})`
              : undefined
          }
          GROUP BY 
            entity_id,
            entity_type;
        `,
        format: "JSONEachRow",
      });

      const entities = await data.json<{ id: string; type: string }[]>();
      const { id, type, lastSeenAt, ...rest } = entity;

      return {
        ...entity,
        features: getOrderedFeatures({
          type: "entity",
          eventOrEntity: { type, features: rest },
          eventOrEntityTypes: entityTypes,
          eventOrEntityFeatures: entityFeatures,
          features,
          entities: entities,
          entityTypes,
        }),
      };
    }),

  findRelatedEntities: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        entityType: z.string().optional(),
        entityLabel: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const relatedEntities = await ctx.prisma.$queryRawUnsafe<
        Array<{
          entityId: string;
          entityType: string;
          entityName: string;
          linkType: string;
          eventType: string;
          count: number;
          entityLabels: Array<{
            id: string;
            name: string;
            color: string;
          }>;
        }>
      >(`
      WITH "RelatedEvents" AS (
          SELECT DISTINCT
              "eventId"
          FROM "EntityAppearancesMatView"
          WHERE "entityId" = '${input.id}'
      )
      SELECT
          "entityId",
          "Entity"."type" AS "entityType",
          "Entity"."name" AS "entityName",
          "linkType",
          "eventType",
          COUNT(DISTINCT "EntityAppearancesMatView"."eventId") as "count",
          ARRAY_AGG(
            json_build_object('id', "EntityLabel"."id", 'name', "EntityLabel"."name", 'color', "EntityLabel"."color")
          ) AS "entityLabels"
      FROM "RelatedEvents"
      JOIN "EntityAppearancesMatView" ON "RelatedEvents"."eventId" = "EntityAppearancesMatView"."eventId"
      JOIN "Entity" ON "Entity"."id" = "EntityAppearancesMatView"."entityId"
      LEFT JOIN "EntityLabel" ON "EntityLabel"."id" = "EntityAppearancesMatView"."entityLabel"
      WHERE "EntityAppearancesMatView"."entityId" != '${input.id}'
      ${
        input.entityType
          ? `AND "EntityAppearancesMatView"."entityType" = '${input.entityType}'`
          : ""
      }
      GROUP BY
          "entityId",
          "entityName",
          "Entity"."type",
          "linkType",
          "eventType"
      ORDER BY
          "count" DESC
      LIMIT 100
      `);

      const ret = relatedEntities
        .map((entity) => ({
          ...entity,
          count: Number(entity.count),
          entityLabels: entity.entityLabels
            .filter((label) => !!label.id)
            .filter(
              // unique on id
              (label, index, self) =>
                self.findIndex((l) => l.id === label.id) === index
            ),
        }))
        .filter((entity) => {
          return entity.entityLabels.some(
            (label) => !input.entityLabel || label.id === input.entityLabel
          );
        });
      return ret;
    }),
});

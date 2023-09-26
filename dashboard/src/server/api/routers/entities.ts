import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  entityFiltersZod,
  eventFiltersZod,
  findTopEntitiesArgs,
} from "../../../shared/validation";
import {
  buildEntityExistsQuery,
  buildEventExistsQuery,
  getFiltersWhereQuery,
} from "../../lib/filters";

export const entitiesRouter = createTRPCRouter({
  findIds: publicProcedure
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

  findEvents: publicProcedure
    .input(
      z.object({
        entityId: z.string(),
        offset: z.number().optional(),
        limit: z.number().optional(),
        filters: eventFiltersZod.optional(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.event.findMany({
        include: {
          eventLabels: true,
          entityLinks: {
            include: {
              entity: {
                include: {
                  entityLabels: true,
                },
              },
            },
          },
        },
        where: {
          entityLinks: {
            some: {
              // type: "Actor",
              entityId: input.entityId,
            },
          },
          ...getFiltersWhereQuery(input.filters),
        },
        skip: input.offset,
        take: input.limit,
        orderBy: {
          timestamp: "desc",
        },
      });
    }),

  getTimeBuckets: publicProcedure
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

  findTop: publicProcedure
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
  findMany: publicProcedure
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

  get: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.entity.findUnique({
        where: {
          id: input.id,
        },
        include: {
          entityLabels: true,
        },
      });
    }),

  findRelatedEntities: publicProcedure
    .input(
      z.object({
        id: z.string(),
        entityType: z.string().optional(),
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
          // entityLabels: Array<{
          //   id: string;
          //   name: string;
          //   color: string;
          // }>;
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
          "entityType",
          "Entity"."name" AS "entityName",
          "linkType",
          "eventType",
          COUNT(*) as "count"
      FROM "RelatedEvents"
      JOIN "EntityAppearancesMatView" ON "RelatedEvents"."eventId" = "EntityAppearancesMatView"."eventId"
      JOIN "Entity" ON "Entity"."id" = "EntityAppearancesMatView"."entityId"
      WHERE "EntityAppearancesMatView"."entityId" != '${input.id}'
      GROUP BY
          "entityId",
          "entityName",
          "entityType",
          "linkType",
          "eventType"
      ORDER BY
          "count" DESC
      LIMIT 10
      `);

      return relatedEntities.map((entity) => ({
        ...entity,
        count: Number(entity.count),
        // entityLabels: entity.entityLabels.filter((label) => !!label.id),
      }));
    }),
});

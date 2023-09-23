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
        datasetId: z.number().default(0),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.entity.findMany({
        where: {
          id: {
            in: input.ids,
          },
          datasetId: input.datasetId,
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
        datasetId: z.number().default(0),
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
          datasetId: input.datasetId,
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
        datasetId: z.number().default(0),
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
          WHERE bucket < to_timestamp(${endInSeconds}) AND
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
          AND "Event"."datasetId" = ${input.datasetId}
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
      LEFT JOIN "EntityLabelToEntity"
          ON "EntityLabelToEntity"."entityId" = entities."entityId"
      LEFT JOIN "EntityLabel"
          ON "EntityLabel"."id" = "EntityLabelToEntity"."entityLabelId"
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
        LEFT JOIN "EntityLabelToEntity" ON "Entity"."id" = "EntityLabelToEntity"."entityId"
        LEFT JOIN "EntityLabel" ON "EntityLabelToEntity"."entityLabelId" = "EntityLabel"."id"
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
        datasetId: z.number().default(0),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.entity.findMany({
        include: {
          entityLabels: true,
        },
        where: {
          type: input.filters?.type,
          datasetId: input.datasetId,
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
        datasetId: z.number().default(0),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.entity.findUnique({
        where: {
          id: input.id,
          datasetId: input.datasetId,
        },
        include: {
          entityLabels: {
            include: {
              entityLabel: true,
            },
          },
        },
      });
    }),

  findRelatedEntities: publicProcedure
    .input(
      z.object({
        id: z.string(),
        entityType: z.string().optional().nullable(),
        datasetId: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const relatedEntities = await ctx.prisma.$queryRawUnsafe<
        Array<{
          id: string;
          type: string;
          name: string;
          linkCount: number;
          entityLabels: Array<string>;
        }>
      >(`
        SELECT
            "Entity"."id",
            "Entity"."type",
            "Entity"."name",
            "EntityType"."name" AS "type_name",
            COUNT(DISTINCT "LinkToInput"."eventId") AS "linkCount",
            ARRAY_AGG(DISTINCT "EntityLabel"."name" || '|' || "EntityLabel"."color") AS "entityLabels"
        FROM
            "Entity"
        JOIN
            "EntityType" ON "Entity"."type" = "EntityType"."id" AND "EntityType"."datasetId" = ${input.datasetId}
        JOIN
            "EventToEntityLink" ON "EventToEntityLink"."entityId" = "Entity"."id" AND "EventToEntityLink"."datasetId" = ${input.datasetId}
        JOIN
            "Event" ON "Event"."id" = "EventToEntityLink"."eventId" AND "Event"."datasetId" = ${input.datasetId}
        LEFT JOIN
            "EventToEntityLink" AS "LinkToInput" ON "LinkToInput"."eventId" = "Event"."id" AND "LinkToInput"."entityId" = '${input.id}'
        LEFT JOIN
            "EntityLabelToEntity" ON "Entity"."id" = "EntityLabelToEntity"."entityId" AND "EntityLabelToEntity"."datasetId" = ${input.datasetId}
        LEFT JOIN
            "EntityLabel" ON "EntityLabelToEntity"."entityLabelId" = "EntityLabel"."id" AND "EntityLabel"."datasetId" = ${input.datasetId}
        WHERE
            "Entity"."id" != '${input.id}'
            AND "Entity"."datasetId" = ${input.datasetId}
            AND "EntityType"."name" = '${input.entityType}'
            AND EXISTS (
                SELECT 1
                FROM "EventToEntityLink" AS "SubLink"
                WHERE
                    "SubLink"."eventId" = "Event"."id" AND "SubLink"."entityId" = '${input.id}'
            )
        GROUP BY
            "Entity"."id", "Entity"."type", "Entity"."name", "EntityType"."name"
        ORDER BY
            COUNT(DISTINCT "EntityLabel"."id") DESC,
            COUNT(DISTINCT "LinkToInput"."eventId") DESC;

  
      `);

      return relatedEntities.map((entity) => ({
        ...entity,
        linkCount: Number(entity.linkCount),
        entityLabels: entity.entityLabels.flatMap((label) => {
          if (!label) return [];
          const arr = label.split("|");
          return [
            {
              name: arr[0] ?? "",
              color: arr[1] ?? "",
            },
          ];
        }),
      }));
    }),
});

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  buildEntityExistsQuery,
  buildEventExistsQuery,
  getFiltersWhereQuery,
} from "../../lib/filters";
import { entityFiltersZod, eventFiltersZod } from "../../../shared/validation";

export const eventsRouter = createTRPCRouter({
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
          WHERE bucket < to_timestamp(${endInSeconds})
      ),
      events AS (
        SELECT "Event"."id", "Event"."timestamp" FROM "Event"

        WHERE (
            "Event"."datasetId" = ${input.datasetId}
            AND "Event"."timestamp" >= to_timestamp(${startInSeconds})
            AND "Event"."timestamp" <= to_timestamp(${endInSeconds})
            AND ${buildEventExistsQuery(input.eventFilters)}
            AND EXISTS (
              SELECT FROM "EventToEntityLink"
              WHERE
                "EventToEntityLink"."datasetId" = ${input.datasetId}
                AND "EventToEntityLink"."eventId" = "Event"."id"
                AND ${buildEntityExistsQuery(
                  input.entityFilters,
                  '"EventToEntityLink"."entityId"'
                )}
            )
        ) 
        OR "Event"."timestamp" IS NULL
      )
      SELECT
          tb.bucket AS bucket,
          "EventLabel"."name" AS label,
          "EventLabel"."color" AS "labelColor",
          COUNT(events."timestamp") AS count
      FROM
          TimeBucketTable AS tb
      LEFT JOIN events
          ON
          events."timestamp" >= tb.bucket AND
          events."timestamp" < tb.bucket + INTERVAL '1 second' * ${intervalInSeconds}
      LEFT JOIN "EventLabelToEvent"
          ON "EventLabelToEvent"."eventId" = events."id" AND "EventLabelToEvent"."datasetId" = ${
            input.datasetId
          }
      LEFT JOIN "EventLabel"
          ON "EventLabel"."id" = "EventLabelToEvent"."eventLabelId" AND "EventLabel"."datasetId" = ${
            input.datasetId
          }
      GROUP BY
          tb.bucket, "EventLabel"."name", "EventLabel"."color"
      ORDER BY
          tb.bucket;
      `);

      // console.log("bucketsFromDB", bucketsFromDB);

      // turn row into array of bucket, map of counts (EventLabel -> count)

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

  getEventLabelDistributions: publicProcedure
    .input(
      z.object({
        eventFilters: eventFiltersZod,
        entityFilters: entityFiltersZod,
        datasetId: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // write above query in raw sql to avoid n+1 problem
      const eventLabelDistros = await ctx.prisma.$queryRawUnsafe<
        Array<{
          label: string;
          count: number;
        }>
      >(
        `
          SELECT
            "EventLabel"."name" as label, 
            COUNT(*) as count
          FROM
            "EventLabelToEvent"
          JOIN
            "EventLabel" 
          ON
            "EventLabelToEvent"."eventLabelId" = "EventLabel"."id"
            AND "EventLabel"."datasetId" = ${input.datasetId}
          WHERE
            ${buildEventExistsQuery(
              input.eventFilters,
              '"EventLabelToEvent"."eventId"'
            )}
            AND "EventLabelToEvent"."datasetId" = ${input.datasetId}
            AND EXISTS (
              SELECT FROM "EventToEntityLink"
              WHERE
                "EventToEntityLink"."eventId" = "EventLabelToEvent"."eventId"
                AND "EventToEntityLink"."datasetId" = ${input.datasetId}
                AND ${buildEntityExistsQuery(
                  input.entityFilters,
                  '"EventToEntityLink"."entityId"'
                )}
            )
          GROUP BY
            "EventLabel"."name"
          ORDER BY
            count DESC
          `
      );

      return eventLabelDistros.map((dbEventLabelDistro) => ({
        label: dbEventLabelDistro.label,
        count: Number(dbEventLabelDistro.count),
      }));
    }),
  getEventTypeDistributions: publicProcedure
    .input(
      z.object({
        eventFilters: eventFiltersZod,
        entityFilters: entityFiltersZod,
      })
    )
    .query(async ({ ctx, input }) => {
      const eventTypeDistros = await ctx.prisma.$queryRawUnsafe<
        Array<{
          label: string;
          count: number;
        }>
      >(
        `
          SELECT
            "Event"."type" as label,
            COUNT(*) as count
          FROM
            "Event"
          WHERE            
            ${buildEventExistsQuery(input.eventFilters)}
            AND EXISTS (
              SELECT FROM "EventToEntityLink"
              WHERE ${buildEntityExistsQuery(
                input.entityFilters,
                '"EventToEntityLink"."entityId"'
              )}
            )
          GROUP BY
            "Event"."type"
          ORDER BY
            count DESC
          `
      );

      return eventTypeDistros.map((dbEventTypeDistro) => ({
        label: dbEventTypeDistro.label,
        count: Number(dbEventTypeDistro.count),
      }));
    }),
  getEntityLabelDistributions: publicProcedure
    .input(
      z.object({
        eventFilters: eventFiltersZod,
        entityFilters: entityFiltersZod,
      })
    )
    .query(async ({ ctx, input }) => {
      const entityLabelDistros = await ctx.prisma.$queryRawUnsafe<
        Array<{
          label: string;
          color: string;
          count: number;
        }>
      >(
        `
      SELECT
        "EntityLabel"."name" as label,
        "EntityLabel"."color" as color,
        COUNT(*) as count
      FROM
        "EntityLabelToEntity"
      JOIN
        "EntityLabel"
      ON
        "EntityLabelToEntity"."entityLabelId" = "EntityLabel"."id"
      WHERE EXISTS (
        SELECT FROM "EventToEntityLink"
        WHERE 
          "EventToEntityLink"."entityId" = "EntityLabelToEntity"."entityId"
          AND ${buildEntityExistsQuery(
            input.entityFilters,
            '"EventToEntityLink"."entityId"'
          )}
          AND ${buildEventExistsQuery(
            input.eventFilters,
            '"EventToEntityLink"."eventId"'
          )}
      )
      GROUP BY
        "EntityLabel"."name", "EntityLabel"."color"
      ORDER BY
        count DESC
      `
      );

      return entityLabelDistros.map((dbEntityLabelDistro) => ({
        ...dbEntityLabelDistro,
        count: Number(dbEntityLabelDistro.count),
      }));
    }),

  findMany: publicProcedure
    .input(
      z.object({
        offset: z.number().optional(),
        limit: z.number().optional(),
        filters: eventFiltersZod,
      })
    )
    .query(async ({ ctx, input }) => {
      const [count, rows] = await Promise.all([
        ctx.prisma.event.count({
          where: getFiltersWhereQuery(input.filters),
        }),
        ctx.prisma.event.findMany({
          include: {
            eventLabels: true,
            entityLinks: {
              include: {
                entity: {
                  include: {
                    _count: {
                      select: {
                        eventLinks: true,
                      },
                    },
                    entityLabels: true,
                  },
                },
              },
            },
          },
          where: getFiltersWhereQuery(input.filters),
          skip: input.offset,
          take: input.limit,
          orderBy: {
            timestamp: "desc",
          },
        }),
      ]);

      return {
        count,
        rows,
      };
    }),

  findManyFrom: publicProcedure
    .input(
      z.object({
        startTimestamp: z.number(),
        endTimestamp: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.prisma.event.findMany({
        where: {
          timestamp: {
            gte: new Date(input.startTimestamp),
            lte: new Date(input.endTimestamp),
          },
        },
        orderBy: {
          timestamp: "asc",
        },
      });

      return {
        rows,
      };
    }),
});

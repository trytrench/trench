import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  buildEntityExistsQuery,
  buildEventExistsQuery,
  getFiltersWhereQuery,
} from "../../lib/filters";
import { entityFiltersZod, eventFiltersZod } from "../../../shared/validation";
import { db } from "~/server/db";

export const eventsRouter = createTRPCRouter({
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
      events AS (
        SELECT "Event"."id", "Event"."timestamp" FROM "Event"

        WHERE (
            "Event"."timestamp" >= to_timestamp(${startInSeconds})
            AND "Event"."timestamp" <= to_timestamp(${endInSeconds})
            AND ${buildEventExistsQuery(input.eventFilters)}
            AND EXISTS (
              SELECT FROM "EventToEntityLink"
              WHERE
                "EventToEntityLink"."eventId" = "Event"."id"
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
      LEFT JOIN "_EventToEventLabel"
          ON "_EventToEventLabel"."A" = events."id"
      LEFT JOIN "EventLabel"
          ON "EventLabel"."id" = "_EventToEventLabel"."B"
      GROUP BY
          tb.bucket, "EventLabel"."name", "EventLabel"."color"
      ORDER BY
          tb.bucket;
      `);

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
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await db.query({
        query: `
          SELECT 
              label,
              COUNT(DISTINCT event_id) AS count
          FROM 
              event_entity_event_labels
          WHERE 
              entity_id = '${input.eventFilters?.entityId}'
          GROUP BY 
              label
          ORDER BY 
              count DESC;
        `,
        format: "JSONEachRow",
      });

      return result.json<
        {
          label: string;
          count: number;
        }[]
      >();
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
        "_EntityToEntityLabel"
      JOIN
        "EntityLabel"
      ON
        "_EntityToEntityLabel"."B" = "EntityLabel"."id"
      WHERE EXISTS (
        SELECT FROM "EventToEntityLink"
        WHERE 
          "EventToEntityLink"."entityId" = "_EntityToEntityLabel"."A"
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
});

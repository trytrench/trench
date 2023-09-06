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
      })
    )
    .query(async ({ ctx, input }) => {
      // Convert milliseconds to seconds
      const startInSeconds = Math.ceil(input.start / 1000);
      const endInSeconds = Math.ceil(input.end / 1000);
      const intervalInSeconds = Math.ceil(input.interval / 1000);

      const bucketsFromDB = await ctx.prisma.$queryRawUnsafe<
        Array<{
          bucket: number;
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
        SELECT "Event"."timestamp" FROM "Event"

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
          COUNT(events."timestamp") AS count
      FROM
          TimeBucketTable AS tb
      LEFT JOIN events
          ON
          events."timestamp" >= tb.bucket AND
          events."timestamp" < tb.bucket + INTERVAL '1 second' * ${intervalInSeconds}
      GROUP BY
          tb.bucket
      ORDER BY
          tb.bucket;
      `);

      return bucketsFromDB
        .map((bucket) => ({
          bucket: bucket.bucket,
          count: Number(bucket.count),
        }))
        .slice(0, -1);
    }),

  getEventLabelDistributions: publicProcedure
    .input(
      z.object({
        eventFilters: eventFiltersZod,
        entityFilters: entityFiltersZod,
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
            "_EventToEventLabel"."B" as label, 
            COUNT(*) as count
          FROM
            "_EventToEventLabel"
          WHERE
            ${buildEventExistsQuery(
              input.eventFilters,
              '"_EventToEventLabel"."A"'
            )}
            AND EXISTS (
              SELECT FROM "EventToEntityLink"
              WHERE
                "EventToEntityLink"."eventId" = "_EventToEventLabel"."A"
                AND ${buildEntityExistsQuery(
                  input.entityFilters,
                  '"EventToEntityLink"."entityId"'
                )}
            )
          GROUP BY
            "_EventToEventLabel"."B"
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
          count: number;
        }>
      >(
        `
      SELECT
        "_EntityToEntityLabel"."B" as label,
        COUNT(*) as count
      FROM
        "_EntityToEntityLabel"
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
        "_EntityToEntityLabel"."B"
      ORDER BY
        count DESC
      `
      );

      return entityLabelDistros.map((dbEntityLabelDistro) => ({
        label: dbEntityLabelDistro.label,
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
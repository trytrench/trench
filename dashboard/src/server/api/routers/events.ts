import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  buildEntityExistsQuery,
  buildEventExistsQuery,
  getFiltersWhereQuery,
} from "../../lib/filters";
import { entityFiltersZod, eventFiltersZod } from "../../../shared/validation";
import { db } from "~/server/db";
import { uniq } from "lodash";

export const eventsRouter = createTRPCRouter({
  getTimeBins: publicProcedure
    .input(
      z.object({
        interval: z.number(),
        start: z.date(),
        end: z.date(),
        entityId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await db.query({
        query: `
          SELECT 
              toStartOfInterval(event_timestamp, INTERVAL 1 day) AS time,
              label,
              count(DISTINCT event_id) AS count
          FROM 
              event_entity_event_labels
          WHERE 
              entity_id = '${input.entityId}'
              AND event_timestamp BETWEEN parseDateTimeBestEffort('${input.start.toISOString()}') AND parseDateTimeBestEffort('${input.end.toISOString()}')
          GROUP BY 
              time,
              label
          ORDER BY 
              time ASC
          WITH FILL
          FROM parseDateTimeBestEffort('${input.start.toISOString()}')
          TO parseDateTimeBestEffort('${input.end.toISOString()}')
          STEP INTERVAL 1 day
        `,
        format: "JSONEachRow",
      });

      const bins = await result.json<
        { time: string; label: string; count: number }[]
      >();

      const binData = bins.reduce((acc, bin) => {
        if (!acc[bin.time]) acc[bin.time] = {};
        acc[bin.time]![bin.label] = bin.count;
        return acc;
      }, {} as Record<string, Record<string, number>>);

      const times = uniq(bins.map((bin) => bin.time));
      const labels = uniq(bins.map((bin) => bin.label));

      const allBins: Record<string, Record<string, number>> = {};
      for (const time of times) {
        for (const label of labels) {
          if (!allBins[time]) allBins[time] = {};
          allBins[time]![label] = binData[time]?.[label] ?? 0;
        }
      }

      return {
        bins: allBins,
        labels,
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

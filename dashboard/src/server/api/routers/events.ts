import { uniq } from "lodash";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getBins } from "~/server/utils/getBins";
import { eventFiltersZod } from "../../../shared/validation";
import { getFiltersWhereQuery } from "../../lib/filters";

export const eventsRouter = createTRPCRouter({
  getEventTypeTimeData: publicProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
        entityId: z.string().optional(),
        datasetId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await db.query({
        query: `
          SELECT 
              toStartOfInterval(event_timestamp, INTERVAL 1 day) AS time,
              event_type as label,
              count(DISTINCT event_id) AS count
          FROM 
              event_entity
          WHERE 
              dataset_id = '${input.datasetId}'
              AND event_timestamp BETWEEN parseDateTimeBestEffort('${input.start.toISOString()}') AND parseDateTimeBestEffort('${input.end.toISOString()}')
              ${input.entityId ? `AND entity_id = '${input.entityId}'` : ""}
          GROUP BY 
              time,
              event_type
          ORDER BY 
              time ASC
          WITH FILL
          FROM toStartOfInterval(parseDateTimeBestEffort('${input.start.toISOString()}'), INTERVAL 1 day)
          TO toStartOfInterval(parseDateTimeBestEffort('${input.end.toISOString()}'), INTERVAL 1 day)
          STEP INTERVAL 1 day;
        `,
        format: "JSONEachRow",
      });

      const rawData =
        await result.json<{ time: string; label: string; count: string }[]>();
      const data = rawData.map((datum) => ({
        ...datum,
        count: Number(datum.count),
      }));

      return {
        bins: getBins(data),
        labels: uniq(data.map((bin) => bin.label).filter(Boolean)),
      };
    }),

  getEntityTypeTimeData: publicProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
        entityId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await db.query({
        query: `
          SELECT 
              toStartOfInterval(event_timestamp, INTERVAL 1 day) AS time,
              entity_type as label,
              count(DISTINCT event_id) AS count
          FROM 
              event_entity
          WHERE 
              event_timestamp BETWEEN parseDateTimeBestEffort('${input.start.toISOString()}') AND parseDateTimeBestEffort('${input.end.toISOString()}')
              ${input.entityId ? `AND entity_id = '${input.entityId}'` : ""}
          GROUP BY 
              time,
              entity_type
          ORDER BY 
              time ASC
          WITH FILL
          FROM toStartOfInterval(parseDateTimeBestEffort('${input.start.toISOString()}'), INTERVAL 1 day)
          TO toStartOfInterval(parseDateTimeBestEffort('${input.end.toISOString()}'), INTERVAL 1 day)
          STEP INTERVAL 1 day;
        `,
        format: "JSONEachRow",
      });

      const rawData =
        await result.json<{ time: string; label: string; count: string }[]>();

      const data = rawData.map((datum) => ({
        ...datum,
        count: Number(datum.count),
      }));

      return {
        bins: getBins(data),
        labels: uniq(data.map((bin) => bin.label).filter(Boolean)),
      };
    }),

  getEventLabelTimeData: publicProcedure
    .input(
      z.object({
        // interval: z.number(),
        start: z.date(),
        end: z.date(),
        entityId: z.string().optional(),
        datasetId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await db.query({
        query: `
          SELECT 
              toStartOfInterval(event_timestamp, INTERVAL 1 day) AS time,
              event_type,
              label,
              count(DISTINCT event_id) AS count
          FROM 
              event_entity_event_labels
          WHERE 
              dataset_id = '${input.datasetId}'
              AND event_timestamp BETWEEN parseDateTimeBestEffort('${input.start.toISOString()}') AND parseDateTimeBestEffort('${input.end.toISOString()}')
              ${input.entityId ? `AND entity_id = '${input.entityId}'` : ""}
          GROUP BY 
              time,
              label,
              event_type
          ORDER BY 
              time ASC
          WITH FILL
          FROM toStartOfInterval(parseDateTimeBestEffort('${input.start.toISOString()}'), INTERVAL 1 day)
          TO toStartOfInterval(parseDateTimeBestEffort('${input.end.toISOString()}'), INTERVAL 1 day)
          STEP INTERVAL 1 day;
        `,
        format: "JSONEachRow",
      });

      const rawData =
        await result.json<
          { time: string; label: string; event_type: string; count: string }[]
        >();
      const data = rawData.map((datum) => ({
        ...datum,
        count: Number(datum.count),
      }));

      const eventTypes = uniq(data.map((bin) => bin.event_type)).filter(
        Boolean
      );

      const bins: Record<string, Record<string, Record<string, number>>> = {};
      const labels: Record<string, string[]> = {};

      for (const eventType of eventTypes) {
        bins[eventType] = getBins(
          data.filter((bin) => bin.event_type === eventType || !bin.event_type)
        );

        labels[eventType] = uniq(
          data
            .filter((bin) => bin.event_type === eventType)
            .map((bin) => bin.label)
            .filter(Boolean)
        );
      }

      return { bins, labels };
    }),

  getEntityLabelTimeData: publicProcedure
    .input(
      z.object({
        // interval: z.number(),
        start: z.date(),
        end: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await db.query({
        query: `
          SELECT 
              toStartOfInterval(event_timestamp, INTERVAL 1 day) AS time,
              entity_type,
              label,
              count(DISTINCT event_id) AS count
          FROM 
              event_entity_entity_labels
          WHERE 
              event_timestamp BETWEEN parseDateTimeBestEffort('${input.start.toISOString()}') AND parseDateTimeBestEffort('${input.end.toISOString()}')
          GROUP BY 
              time,
              label,
              entity_type
          ORDER BY 
              time ASC
          WITH FILL
          FROM toStartOfInterval(parseDateTimeBestEffort('${input.start.toISOString()}'), INTERVAL 1 day)
          TO toStartOfInterval(parseDateTimeBestEffort('${input.end.toISOString()}'), INTERVAL 1 day)
          STEP INTERVAL 1 day;
        `,
        format: "JSONEachRow",
      });

      const rawData =
        await result.json<
          { time: string; label: string; entity_type: string; count: string }[]
        >();
      const data = rawData.map((datum) => ({
        ...datum,
        count: Number(datum.count),
      }));

      const entityTypes = uniq(data.map((bin) => bin.entity_type)).filter(
        Boolean
      );

      const bins: Record<string, Record<string, Record<string, number>>> = {};
      const labels: Record<string, string[]> = {};

      for (const entityType of entityTypes) {
        bins[entityType] = getBins(
          data.filter(
            (bin) => bin.entity_type === entityType || !bin.entity_type
          )
        );

        labels[entityType] = uniq(
          data
            .filter((bin) => bin.entity_type === entityType)
            .map((bin) => bin.label)
            .filter(Boolean)
        );
      }

      return { bins, labels };
    }),

  getEventLabelDistributions: publicProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
        entityId: z.string().optional(),
        datasetId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await db.query({
        query: `
          SELECT 
              label,
              event_type,
              COUNT(DISTINCT event_id) AS count
          FROM 
              event_entity_event_labels
          WHERE dataset_id = '${input.datasetId}'
              AND event_timestamp BETWEEN parseDateTimeBestEffort('${input.start.toISOString()}') AND parseDateTimeBestEffort('${input.end.toISOString()}')
              ${input.entityId ? `AND entity_id = '${input.entityId}'` : ""}
          GROUP BY 
              label,
              event_type
          ORDER BY 
              count DESC;
        `,
        format: "JSONEachRow",
      });

      const rawData =
        await result.json<
          { label: string; event_type: string; count: string }[]
        >();
      const data = rawData.map((datum) => ({
        ...datum,
        count: Number(datum.count),
      }));

      return data;
    }),

  getEntityLabelDistributions: publicProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await db.query({
        query: `
          SELECT 
              label,
              entity_type,
              COUNT(DISTINCT event_id) AS count
          FROM 
              event_entity_entity_labels
          WHERE 1=1
              AND event_timestamp BETWEEN parseDateTimeBestEffort('${input.start.toISOString()}') AND parseDateTimeBestEffort('${input.end.toISOString()}')
          GROUP BY 
              label,
              entity_type
          ORDER BY 
              count DESC;
        `,
        format: "JSONEachRow",
      });

      const rawData = await result.json<
        {
          label: string;
          entity_type: string;
          count: string;
        }[]
      >();

      const data = rawData.map((datum) => ({
        ...datum,
        count: Number(datum.count),
      }));

      return data;
    }),

  getEntityTypeDistributions: publicProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await db.query({
        query: `
          SELECT 
              entity_type,
              COUNT(DISTINCT event_id) AS count
          FROM 
              event_entity
          WHERE 1=1
              AND event_timestamp BETWEEN parseDateTimeBestEffort('${input.start.toISOString()}') AND parseDateTimeBestEffort('${input.end.toISOString()}')
          GROUP BY 
              entity_type
          ORDER BY 
              count DESC;
        `,
        format: "JSONEachRow",
      });

      const rawData = await result.json<
        {
          entity_type: string;
          count: string;
        }[]
      >();

      const data = rawData.map((datum) => ({
        ...datum,
        count: Number(datum.count),
      }));

      return data;
    }),

  getEventTypeDistributions: publicProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
        entityId: z.string().optional(),
        datasetId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await db.query({
        query: `
          SELECT 
              event_type,
              COUNT(DISTINCT event_id) AS count
          FROM 
              event_entity
          WHERE dataset_id = '${input.datasetId}'
              AND event_timestamp BETWEEN parseDateTimeBestEffort('${input.start.toISOString()}') AND parseDateTimeBestEffort('${input.end.toISOString()}')
              ${input.entityId ? `AND entity_id = '${input.entityId}'` : ""}
          GROUP BY 
              event_type
          ORDER BY 
              count DESC;
        `,
        format: "JSONEachRow",
      });

      const rawData = await result.json<
        {
          event_type: string;
          count: number;
        }[]
      >();
      const data = rawData.map((datum) => ({
        ...datum,
        count: Number(datum.count),
      }));

      return data;
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

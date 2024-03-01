import { db } from "databases";
import { uniq } from "lodash";
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { getBins } from "~/server/utils/getBins";

export const chartsRouter = createTRPCRouter({
  getEventTypeTimeData: publicProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
        entity: z.object({
          type: z.string(),
          id: z.string(),
        }),
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
              features
          WHERE 
              feature_type = 'EntityAppearance'
              AND entity_type = '${input.entity.type}'
              AND entity_id = '${input.entity.id}'
              AND event_timestamp BETWEEN parseDateTimeBestEffort('${input.start.toISOString()}') AND parseDateTimeBestEffort('${input.end.toISOString()}')
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

  getEventTypeCounts: publicProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
        entity: z.object({
          type: z.string(),
          id: z.string(),
        }),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await db.query({
        query: `
          SELECT 
              event_type,
              COUNT(DISTINCT event_id) AS count
          FROM 
              features
          WHERE 
              event_timestamp BETWEEN parseDateTimeBestEffort('${input.start.toISOString()}') AND parseDateTimeBestEffort('${input.end.toISOString()}')
              AND feature_type = 'EntityAppearance'
              AND entity_type = '${input.entity.type}'
              AND entity_id = '${input.entity.id}'
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
});

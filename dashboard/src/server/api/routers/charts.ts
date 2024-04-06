import { db } from "databases";
import { uniq } from "lodash";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getBins } from "~/server/utils/getBins";
import { EntityFilterType, entityFiltersZod } from "../../../shared/validation";
import {
  buildWhereClauseForFeatureFilter,
  getEntityQueryInfo,
} from "../../lib/buildFilterQueries";
import { addHours, format, getUnixTime } from "date-fns";
import { CHART_INTERVAL_HOURS } from "../../../shared/config";

const chartZod = z.object({
  entityFilters: z.array(entityFiltersZod),
  label: z.string(),
});

type Chart = z.infer<typeof chartZod>;

export const chartsRouter = createTRPCRouter({
  getEntityTimeData: protectedProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
        charts: z.array(chartZod),
      })
    )
    .query(async ({ ctx, input }) => {
      const getBinsFromChart = async (chart: Chart) => {
        const { entityType, featureConditions, seenFilter, seenWithFilter } =
          getEntityQueryInfo(chart.entityFilters);

        const featureIds = Array.from(
          new Set(
            chart.entityFilters
              .map((f) => {
                if (f.type === EntityFilterType.Feature) {
                  return f.data.featureId;
                } else {
                  return null;
                }
              })
              .filter(Boolean)
          )
        );

        const chartQuery = `
            SELECT toUnixTimestamp(time) as unix_time, count FROM (
                SELECT 
                    time,
                    count(DISTINCT unique_entity_id) AS count
                FROM (
                    SELECT 
                        toStartOfInterval(event_timestamp, INTERVAL ${CHART_INTERVAL_HOURS} hour) AS time,
                        unique_entity_id,
                        max(event_timestamp) as last_seen
                    FROM features
                    WHERE 1
                    ${entityType ? `AND entity_type = '${entityType}'` : ""}
                    ${
                      featureIds.length > 0
                        ? `AND feature_id IN (${featureIds
                            .map((id) => `'${id}'`)
                            .join(", ")})`
                        : ""
                    }
                    ${
                      seenFilter?.to
                        ? `AND event_timestamp <= ${getUnixTime(seenFilter.to)}`
                        : ""
                    }
                    ${
                      input.end
                        ? `AND event_timestamp <= ${getUnixTime(
                            addHours(input.end, CHART_INTERVAL_HOURS)
                          )}`
                        : ""
                    }
                    ${
                      featureConditions.length > 0
                        ? `AND (${featureConditions.join(" OR ")})`
                        : ""
                    }
                    ${
                      seenWithFilter
                        ? `AND unique_entity_id IN (
                              SELECT DISTINCT eav.unique_entity_id_2
                              FROM entity_links_view AS eav
                              WHERE eav.unique_entity_id_1 = '${seenWithFilter.type}_${seenWithFilter.id}'
                          )`
                        : ""
                    }
                    GROUP BY
                        time,
                        unique_entity_id
                    HAVING 1
                    ${
                      featureIds.length > 0
                        ? `AND count(DISTINCT feature_id) >= ${featureIds.length}`
                        : ""
                    }
                    ${
                      seenFilter?.from
                        ? `AND last_seen >= ${getUnixTime(
                            new Date(seenFilter.from)
                          )}`
                        : ""
                    }
                    AND last_seen >= ${getUnixTime(input.start)}
                ) as features
                GROUP BY 
                    time
                ORDER BY 
                    time ASC
                WITH FILL
                FROM toStartOfInterval(fromUnixTimestamp(${getUnixTime(
                  input.start
                )}), INTERVAL ${CHART_INTERVAL_HOURS} hour)
                TO toStartOfInterval(fromUnixTimestamp(${getUnixTime(
                  input.end
                )}), INTERVAL ${CHART_INTERVAL_HOURS} hour) + (INTERVAL ${CHART_INTERVAL_HOURS} hour)
                STEP INTERVAL ${CHART_INTERVAL_HOURS} hour
            );
        `;
        const result = await db.query({
          query: chartQuery,
        });

        const rawData = await result.json<{
          data: {
            unix_time: string;
            count: string;
          }[];
          statistics: any;
        }>();

        const data = rawData.data.map((datum) => ({
          time: new Date(Number(datum.unix_time) * 1000).toISOString(),
          count: Number(datum.count),
          label: chart.label,
        }));

        return data;
      };

      const data = (
        await Promise.all(input.charts.map(getBinsFromChart))
      ).flat();

      return {
        bins: getBins(data),
        labels: input.charts.map((chart) => chart.label),
      };
    }),

  getEventTypeTimeData: protectedProcedure
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

  getEventTypeCounts: protectedProcedure
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

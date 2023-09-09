import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  buildEntityExistsQuery,
  buildEventExistsQuery,
  getFiltersWhereQuery,
} from "../../lib/filters";
import { entityFiltersZod, eventFiltersZod } from "../../../shared/validation";
import { get } from "lodash";

export const dashboardRouter = createTRPCRouter({
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

      const timeBucketsRaw = await ctx.prisma.$queryRawUnsafe<
        Array<{
          bucket: Date;
        }>
      >(`
        WITH RECURSIVE TimeBucketTable(bucket) AS (
          SELECT to_timestamp(${startInSeconds}) AS bucket
          UNION ALL
          SELECT bucket + INTERVAL '1 second' * ${intervalInSeconds}
          FROM TimeBucketTable
          WHERE bucket < to_timestamp(${endInSeconds})
        )
        SELECT * FROM TimeBucketTable;
      `);

      const timeBuckets = timeBucketsRaw.map((bucket) =>
        bucket.bucket.getTime()
      );

      const eventTimeBuckets = await ctx.prisma.$queryRawUnsafe<
        Array<{
          bucket: Date;
          type: string;
          label: string | null;
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
        SELECT "Event"."id", "Event"."type", "Event"."timestamp" FROM "Event"

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
      ),
      eventTypeBuckets AS (
        SELECT
            tb.bucket AS bucket,
            events."type" AS "type",
            COUNT(*) AS count
        FROM
            TimeBucketTable AS tb
        LEFT JOIN events
            ON
            events."timestamp" >= tb.bucket AND
            events."timestamp" < tb.bucket + INTERVAL '1 second' * ${intervalInSeconds}
        WHERE
            events."type" IS NOT NULL
        GROUP BY
            tb.bucket, events."type"
      ),
      eventTypeLabelBuckets AS (
        SELECT
            tb.bucket AS bucket,
            events."type" AS "type",
            "_EventToEventLabel"."B" AS "label",
            COUNT(*) AS count
        FROM
            TimeBucketTable AS tb
        LEFT JOIN events
            ON
            events."timestamp" >= tb.bucket AND
            events."timestamp" < tb.bucket + INTERVAL '1 second' * ${intervalInSeconds}
        LEFT JOIN "_EventToEventLabel"
            ON "_EventToEventLabel"."A" = events."id"
        WHERE
            "_EventToEventLabel"."B" IS NOT NULL
            AND events."type" IS NOT NULL
        GROUP BY
            tb.bucket, events."type", "_EventToEventLabel"."B"
      )
      SELECT
          bucket,
          "type",
          NULL AS "label",
          count
      FROM
        eventTypeBuckets
      UNION ALL
      SELECT * FROM 
        eventTypeLabelBuckets
      `);

      const entityTimeBuckets = await ctx.prisma.$queryRawUnsafe<
        Array<{
          bucket: Date;
          type: string;
          label: string | null;
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
    ),
    entityTypeBuckets AS (
      SELECT
          tb.bucket AS bucket,
          "Entity"."type" AS "type",
          COUNT(*) AS count
      FROM
          TimeBucketTable AS tb
      LEFT JOIN entities
          ON
          entities."timestamp" >= tb.bucket AND
          entities."timestamp" < tb.bucket + INTERVAL '1 second' * ${intervalInSeconds}
      LEFT JOIN "Entity"
          ON "Entity"."id" = entities."entityId"
      WHERE
          "Entity"."type" IS NOT NULL
      GROUP BY
          tb.bucket, "Entity"."type"
    ),
    entityTypeLabelBuckets AS (
      SELECT
          tb.bucket AS bucket,
          "Entity"."type" AS "type",
          "_EntityToEntityLabel"."B" AS "label",
          COUNT(*) AS count
      FROM
          TimeBucketTable AS tb
      LEFT JOIN entities
          ON
          entities."timestamp" >= tb.bucket AND
          entities."timestamp" < tb.bucket + INTERVAL '1 second' * ${intervalInSeconds}
      LEFT JOIN "_EntityToEntityLabel"
          ON "_EntityToEntityLabel"."A" = entities."entityId"
      LEFT JOIN "Entity"
          ON "Entity"."id" = entities."entityId"
      WHERE
          "_EntityToEntityLabel"."B" IS NOT NULL
          AND "Entity"."type" IS NOT NULL
      GROUP BY
          tb.bucket, "Entity"."type", "_EntityToEntityLabel"."B"
    )
    SELECT
        bucket,
        "type",
        NULL AS "label",
        count
    FROM
      entityTypeBuckets
    UNION ALL
    SELECT * FROM
      entityTypeLabelBuckets
    `);

      // Get all event labels
      const eventLabels = await ctx.prisma.eventLabel.findMany();

      // Get all entity labels
      const entityLabels = await ctx.prisma.entityLabel.findMany();

      const eventTypes = new Set<string>();
      const entityTypes = new Set<string>();

      for (const bucket of eventTimeBuckets) {
        eventTypes.add(bucket.type);
      }
      for (const bucket of entityTimeBuckets) {
        entityTypes.add(bucket.type);
      }

      type ChartItem = {
        bucket: number;
        value: number;
      };

      function encodeMapKey(...args: (string | null)[]) {
        return args.join("::");
      }

      const resultsMap = new Map<string, ChartItem[]>();
      for (const bucket of eventTimeBuckets) {
        const key = encodeMapKey("Event", bucket.type, bucket.label);

        const result = resultsMap.get(key);
        if (result) {
          result.push({
            bucket: bucket.bucket.getTime(),
            value: bucket.count,
          });
        } else {
          resultsMap.set(key, [
            {
              bucket: bucket.bucket.getTime(),
              value: bucket.count,
            },
          ]);
        }
      }

      for (const bucket of entityTimeBuckets) {
        const key = encodeMapKey("Entity", bucket.type, bucket.label);

        const result = resultsMap.get(key);
        if (result) {
          result.push({
            bucket: bucket.bucket.getTime(),
            value: bucket.count,
          });
        } else {
          resultsMap.set(key, [
            {
              bucket: bucket.bucket.getTime(),
              value: bucket.count,
            },
          ]);
        }
      }

      type Chart = {
        title: string;
        type: "count" | "percent";
        avg: number;
        stdDev: number;
        anomalyCount: number;
        lineColor: string;
        data: ChartItem[];
      };

      const charts = new Map<string, Chart>();
      function convertBigIntToNumber(chart: ChartItem[]) {
        return chart.map((item) => ({
          ...item,
          value: Number(item.value),
        }));
      }
      function padChart(chart: ChartItem[]) {
        const filledChart = timeBuckets
          .map((bucket) => {
            const found = chart.find((chart) => chart.bucket === bucket);
            return {
              bucket,
              value: found ? found.value : 0,
            };
          })
          .slice(0, -1);

        return filledChart;
      }
      function divideCharts(
        numerator: ChartItem[],
        denominator: ChartItem[]
      ): ChartItem[] {
        const dividedChart = numerator.map((numeratorItem, index) => {
          const denominatorItem = denominator[index]!;
          return {
            bucket: numeratorItem.bucket,
            value: denominatorItem.value
              ? (numeratorItem.value / denominatorItem.value) * 100
              : 0,
          };
        });

        return dividedChart;
      }
      // Function to calculate average
      function average(arr: ChartItem[]) {
        const nums = arr.map((item) => item.value);
        const sum = nums.reduce((acc, val) => acc + val, 0);
        return sum / nums.length;
      }

      // Function to calculate standard deviation
      function getStats(arr: ChartItem[]) {
        const nums = arr.map((item) => item.value);
        const avg = average(arr);
        const sumOfSquares = nums.reduce(
          (acc, val) => acc + Math.pow(val - avg, 2),
          0
        );

        const anomalyCount = nums.filter((num) => {
          return num > avg + 3 * Math.sqrt(sumOfSquares / nums.length);
        }).length;

        return {
          stdDev: Math.sqrt(sumOfSquares / nums.length),
          avg: avg,
          anomalyCount,
        };
      }

      for (const eventType of eventTypes) {
        const key = encodeMapKey("Event", eventType, null);
        const chart = resultsMap.get(key)!;
        const eventTypeTotalChart = padChart(convertBigIntToNumber(chart));
        charts.set(key, {
          title: `\`${eventType}\` events`,
          type: "count",
          ...getStats(eventTypeTotalChart),
          lineColor: "blue",
          data: eventTypeTotalChart,
        });

        for (const eventLabel of eventLabels) {
          const key = encodeMapKey("Event", eventType, eventLabel.id);
          const chart = resultsMap.get(key);
          if (chart) {
            const eventLabelChart = divideCharts(
              padChart(convertBigIntToNumber(chart)),
              eventTypeTotalChart
            );
            charts.set(key, {
              title: `% of \`${eventType}\` events with label \`${eventLabel.name}\``,
              type: "percent",
              lineColor: eventLabel.color,
              data: eventLabelChart,
              ...getStats(eventLabelChart),
            });
          }
        }
      }

      for (const entityType of entityTypes) {
        const key = encodeMapKey("Entity", entityType, null);
        const chart = resultsMap.get(key)!;
        const entityTypeTotalChart = padChart(convertBigIntToNumber(chart));
        charts.set(key, {
          title: `\`${entityType}\` entities`,
          type: "count",
          lineColor: "blue",
          data: entityTypeTotalChart,
          ...getStats(entityTypeTotalChart),
        });

        for (const entityLabel of entityLabels) {
          const key = encodeMapKey("Entity", entityType, entityLabel.id);
          const chart = resultsMap.get(key);
          if (chart) {
            const entityLabelChart = divideCharts(
              padChart(convertBigIntToNumber(chart)),
              entityTypeTotalChart
            );
            charts.set(key, {
              title: `% of \`${entityType}\` entities with label \`${entityLabel.name}\``,
              type: "percent",
              lineColor: entityLabel.color,
              data: entityLabelChart,
              ...getStats(entityLabelChart),
            });
          }
        }
      }

      return Array.from(charts.values())
        .filter((chart) => chart.type === "percent")
        .sort((a, b) => b.anomalyCount - a.anomalyCount);
    }),
});

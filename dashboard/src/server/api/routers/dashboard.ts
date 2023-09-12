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
  getTopEntities: publicProcedure
    .input(
      z.object({
        startTime: z.number(),
        endTime: z.number(),
        eventFilters: eventFiltersZod,
        entityFilters: entityFiltersZod,
        limit: z.number().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const entities = await ctx.prisma.$queryRawUnsafe<
        Array<{
          id: string;
          type: string;
          name: string;
          count: number;
        }>
      >(`
        WITH RankedEntities AS (
          SELECT
            "EventToEntityLink"."entityId" AS "id",
            "Entity"."type" AS "type",
            "Entity"."name" AS "name",
            COUNT(*) AS "count",
            ROW_NUMBER() OVER (PARTITION BY "Entity"."type" ORDER BY COUNT(*) DESC) AS rn
          FROM "EventToEntityLink"
          JOIN "Event" ON "EventToEntityLink"."eventId" = "Event"."id"
          JOIN "Entity" ON "EventToEntityLink"."entityId" = "Entity"."id"
          WHERE
            "Event"."timestamp" >= to_timestamp(${Math.ceil(
              input.startTime / 1000
            )})
            AND "Event"."timestamp" <= to_timestamp(${Math.ceil(
              input.endTime / 1000
            )})
            AND ${buildEventExistsQuery(input.eventFilters)}
            AND ${buildEntityExistsQuery(
              input.entityFilters,
              '"EventToEntityLink"."entityId"'
            )}
          GROUP BY
            "EventToEntityLink"."entityId",
            "Entity"."name",
            "Entity"."type"
        )
        SELECT "id", "type", "name", "count"
        FROM RankedEntities
        WHERE rn <= ${input.limit}
        ORDER BY "type", "count" DESC;      
      `);

      // Sort entities by type

      type TopEntityResult = {
        type: string;
        entities: Array<{
          id: string;
          name: string;
          count: number;
        }>;
      };

      const resultsMap = new Map<string, TopEntityResult>();
      for (const entity of entities) {
        const result = resultsMap.get(entity.type);
        if (result) {
          result.entities.push({
            id: entity.id,
            name: entity.name,
            count: Number(entity.count),
          });
        } else {
          resultsMap.set(entity.type, {
            type: entity.type,
            entities: [
              {
                id: entity.id,
                name: entity.name,
                count: Number(entity.count),
              },
            ],
          });
        }
      }

      return Array.from(resultsMap.values());
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
      function prepare(chart: ChartItem[]) {
        const preparedChart = padChart(convertBigIntToNumber(chart));
        return preparedChart;
      }
      function encodeMapKey(...args: (string | null)[]) {
        return args.join("::");
      }
      const ALL_KEY = "__all__";

      const eventLabels = await ctx.prisma.eventLabel.findMany();
      const entityLabels = await ctx.prisma.entityLabel.findMany();
      const eventTypes = new Set<string>();
      const entityTypes = new Set<string>();
      for (const bucket of eventTimeBuckets) {
        eventTypes.add(bucket.type);
      }
      for (const bucket of entityTimeBuckets) {
        entityTypes.add(bucket.type);
      }

      const resultsMap = new Map<string, ChartItem[]>();
      for (const bucket of eventTimeBuckets) {
        const key = encodeMapKey("Event", bucket.type, bucket.label ?? ALL_KEY);

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
        const key = encodeMapKey(
          "Entity",
          bucket.type,
          bucket.label ?? ALL_KEY
        );

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

      const lineMap = new Map<string, Line>();

      for (const eventType of eventTypes) {
        const key = encodeMapKey("Event", eventType, ALL_KEY);
        const chart = resultsMap.get(key)!;
        const eventTypeTotalChart = prepare(chart);
        lineMap.set(key, {
          ...getStats(eventTypeTotalChart),
          color: "blue",
          label: `${eventType} events`,
          data: eventTypeTotalChart,
        });

        for (const eventLabel of eventLabels) {
          const key = encodeMapKey("Event", eventType, eventLabel.id);
          const chart = resultsMap.get(key);
          if (chart) {
            const eventLabelChart = prepare(chart);
            lineMap.set(key, {
              color: eventLabel.color,
              label: `${eventType} events with label "${eventLabel.name}"`,
              data: eventLabelChart,
              ...getStats(eventLabelChart),
            });
          }
        }
      }

      for (const entityType of entityTypes) {
        const key = encodeMapKey("Entity", entityType, ALL_KEY);
        const chart = resultsMap.get(key)!;
        const entityTypeTotalChart = prepare(chart);
        lineMap.set(key, {
          color: "blue",
          label: `${entityType} entities`,
          data: entityTypeTotalChart,
          ...getStats(entityTypeTotalChart),
        });

        for (const entityLabel of entityLabels) {
          const key = encodeMapKey("Entity", entityType, entityLabel.id);
          const chart = resultsMap.get(key);
          if (chart) {
            const entityLabelChart = prepare(chart);
            lineMap.set(key, {
              color: entityLabel.color,
              label: `${entityType} entities with label "${entityLabel.name}"`,
              data: entityLabelChart,
              ...getStats(entityLabelChart),
            });
          }
        }
      }

      // Create anomaly charts
      const anomalyCharts: Chart[] = [];
      for (const eventType of eventTypes) {
        const key = encodeMapKey("Event", eventType, ALL_KEY);
        const eventTypeLine = lineMap.get(key);
        if (!eventTypeLine) {
          continue;
        }

        for (const eventLabel of eventLabels) {
          const key = encodeMapKey("Event", eventType, eventLabel.id);
          const line = lineMap.get(key);
          if (line) {
            const percentageLineData = divideCharts(
              line.data,
              eventTypeLine.data
            );
            const title = `% of \`${eventType}\` with label \`${eventLabel.name}\``;
            const percentageLine: Line = {
              label: title,
              color: eventLabel.color,
              data: percentageLineData,
              ...getStats(percentageLineData),
            };
            anomalyCharts.push({
              title: title,
              type: "percent",
              lines: [percentageLine],
            });
          }
        }
      }

      for (const entityType of entityTypes) {
        const key = encodeMapKey("Entity", entityType, ALL_KEY);
        const entityTypeLine = lineMap.get(key);
        if (!entityTypeLine) {
          continue;
        }

        for (const entityLabel of entityLabels) {
          const key = encodeMapKey("Entity", entityType, entityLabel.id);
          const line = lineMap.get(key);
          if (line) {
            const percentageLineData = divideCharts(
              line.data,
              entityTypeLine.data
            );
            const title = `% of \`${entityType}\` with label \`${entityLabel.name}\``;
            const percentageLine: Line = {
              label: title,
              color: entityLabel.color,
              data: percentageLineData,
              ...getStats(percentageLineData),
            };
            anomalyCharts.push({
              title: title,
              type: "percent",
              lines: [percentageLine],
            });
          }
        }
      }

      // Build event chart

      function addLines(keys: string[]) {
        let chartData = padChart([]);
        for (const key of keys) {
          const line = lineMap.get(key);
          if (line) {
            chartData = addCharts(chartData, line.data);
          }
        }
        return chartData;
      }

      const eventTypeKeys = Array.from(eventTypes).map((eventType) =>
        encodeMapKey("Event", eventType, ALL_KEY)
      );
      const allEventsCounts = addLines(eventTypeKeys);

      lineMap.set(encodeMapKey("Event", ALL_KEY, ALL_KEY), {
        color: "blue",
        label: `Total`,
        data: allEventsCounts,
        ...getStats(allEventsCounts),
      });

      const otherLines: Line[] = [];
      for (const eventLabel of eventLabels) {
        if (eventLabel.name === "Approve") continue;
        const eventLabelKeys = Array.from(eventTypes).map((eventType) =>
          encodeMapKey("Event", eventType, eventLabel.id)
        );
        const eventLabelCounts = addLines(eventLabelKeys);

        const line: Line = {
          color: eventLabel.color,
          label: `${eventLabel.name}`,
          data: eventLabelCounts,
          ...getStats(eventLabelCounts),
        };
        if (line.avg > 0) otherLines.push(line);
      }

      const eventLine: Line = {
        ...lineMap.get(encodeMapKey("Event", ALL_KEY, ALL_KEY))!,
        metadata: {
          isTotal: true,
        },
      };

      const eventChart: Chart = {
        title: "Events",
        type: "count",
        lines: [eventLine, ...otherLines],
      };

      const res = {
        anomalyCharts: anomalyCharts.sort((a, b) => {
          return b.lines[0]!.anomalyCount - a.lines[0]!.anomalyCount;
        }),
        eventChart: eventChart,
      };

      return res;
    }),
});

type ChartItem = {
  bucket: number;
  value: number;
};

type Line = {
  avg: number;
  stdDev: number;
  anomalyCount: number;
  anomalyRanges: Array<{
    startTime: number;
    endTime: number;
  }>;
  color: string;
  label: string;
  data: ChartItem[];
  metadata?: Record<string, unknown>;
};

type Chart = {
  title: string;
  type: "count" | "percent";
  lines: Line[];
};

function convertBigIntToNumber(chart: ChartItem[]) {
  return chart.map((item) => ({
    ...item,
    value: Number(item.value),
  }));
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
function addCharts(chart1: ChartItem[], chart2: ChartItem[]): ChartItem[] {
  const addedChart = chart1.map((chart1Item, index) => {
    const chart2Item = chart2[index]!;
    return {
      bucket: chart1Item.bucket,
      value: chart1Item.value + chart2Item.value,
    };
  });

  return addedChart;
}
function average(arr: ChartItem[]) {
  const nums = arr.map((item) => item.value);
  const sum = nums.reduce((acc, val) => acc + val, 0);
  return sum / nums.length;
}

// Function to calculate standard deviation and detect anomalies
function getStats(arr: ChartItem[]) {
  const nums = arr.map((item) => item.value);
  const avg = average(arr);
  const sumOfSquares = nums.reduce(
    (acc, val) => acc + Math.pow(val - avg, 2),
    0
  );

  const stdDev = Math.sqrt(sumOfSquares / nums.length);

  const anomalies = nums.map((num, index) => {
    return num > avg + 3 * stdDev;
  });

  const anomalyRanges: Array<{
    startTime: number;
    endTime: number;
  }> = [];

  for (let i = 0; i < anomalies.length; i++) {
    if (anomalies[i]) {
      const startRange = i === 0 ? 0 : i - 1;
      let endRange = i + 1;

      // Merge contiguous anomalies into one range
      while (i < anomalies.length - 1 && anomalies[i + 1]) {
        endRange++; // Extend the end of the range
        i++; // Skip the next anomaly index as it is part of the current range
      }

      anomalyRanges.push({
        startTime: arr[startRange]!.bucket,
        endTime: arr[endRange]!.bucket,
      });
    }
  }

  const anomalyCount = anomalies.filter(Boolean).length;

  return {
    stdDev,
    avg,
    anomalyCount,
    anomalyRanges,
  };
}

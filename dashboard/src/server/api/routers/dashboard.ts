import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  buildEntityExistsQuery,
  buildEventExistsQuery,
} from "../../lib/filters";
import { entityFiltersZod, eventFiltersZod } from "../../../shared/validation";
import { Prisma, PrismaClient } from "@prisma/client";

export const dashboardRouter = createTRPCRouter({
  getTopEntities: publicProcedure
    .input(
      z.object({
        startTime: z.number(),
        endTime: z.number(),
        eventFilters: eventFiltersZod,
        entityFilters: entityFiltersZod,
        limit: z.number().default(10),
        datasetId: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const entities = await ctx.prisma.$queryRawUnsafe<
        Array<{
          id: string;
          type: string;
          typeName: string;
          name: string;
          count: number;
        }>
      >(`
        WITH "RankedEntities" AS (
          SELECT
            "EventToEntityLink"."entityId" AS "id",
            "Entity"."type" AS "type",
            "Entity"."name" AS "name",
            COUNT(*) AS "count",
            ROW_NUMBER() OVER (PARTITION BY "Entity"."type" ORDER BY COUNT(*) DESC) AS rn
          FROM "EventToEntityLink"
          JOIN "Event" 
            ON "EventToEntityLink"."eventId" = "Event"."id" 
            AND "Event"."datasetId" = ${input.datasetId}
          JOIN "Entity" 
            ON "EventToEntityLink"."entityId" = "Entity"."id" 
            AND "Entity"."datasetId" = ${input.datasetId}
          WHERE
            "EventToEntityLink"."datasetId" = ${input.datasetId}
            AND "Event"."timestamp" >= to_timestamp(${Math.ceil(
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
            "Entity"."type",
            "EventToEntityLink"."datasetId"
        )
        SELECT "RankedEntities"."id", "type", "EntityTcype"."name" as "typeName", "RankedEntities"."name", "count"
        FROM "RankedEntities"
        JOIN "EntityType"
          ON "EntityType"."id" = "RankedEntities"."type"
          AND "EntityType"."datasetId" = ${input.datasetId}
        WHERE rn <= ${input.limit}
        ORDER BY "type", "typeName", "count" DESC;      
      `);

      // Sort entities by type

      type TopEntityResult = {
        type: string;
        typeName: string;
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
            typeName: entity.typeName,
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

      const topLists = Array.from(resultsMap.values())
        .map((list) => {
          const average =
            list.entities.reduce((acc, val) => acc + val.count, 0) /
            list.entities.length;
          const stdDev = Math.sqrt(
            list.entities.reduce(
              (acc, val) => acc + Math.pow(val.count - average, 2),
              0
            ) / list.entities.length
          );

          const numAnomalies = list.entities.filter(
            (entity) => entity.count > average + 3 * stdDev
          ).length;
          return {
            ...list,
            average: average,
            stdDev: stdDev,

            numAnomalies: numAnomalies,
          };
        })
        .sort((a, b) => b.numAnomalies - a.numAnomalies);

      return topLists;
    }),
  getTopEntitiesOfTypeAndLabel: publicProcedure
    .input(
      z.object({
        startTime: z.number(),
        endTime: z.number(),
        type: z.string(),
        label: z.string().optional(),
        eventFilters: eventFiltersZod,
        limit: z.number().default(10),
        datasetId: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const startTimeInSeconds = Math.ceil(input.startTime / 1000);
      const endTimeInSeconds = Math.ceil(input.endTime / 1000);

      // Queryrawunsafe version of the above query
      const topEntities = await ctx.prisma.$queryRawUnsafe<
        Array<{
          entityId: string;
          entityType: string;
          entityName: string;
          count: bigint;
        }>
      >(`
        WITH "TopEntities" AS (
            SELECT
                "entityId",
                COUNT(*) as "count"
            FROM "EntityAppearancesMatView"
            WHERE
                "datasetId" = ${input.datasetId}
                AND "timestamp" >= to_timestamp(${startTimeInSeconds})
                AND "timestamp" <= to_timestamp(${endTimeInSeconds})
                AND "entityType" = '${input.type}'
                ${input.label ? `AND "entityLabel" = '${input.label}'` : ""}
            GROUP BY
                "entityId"
            ORDER BY
                "count" DESC
            LIMIT ${input.limit}
        )
        SELECT
          "TopEntities"."entityId",
          "Entity"."type" as "entityType",
          "Entity"."name" as "entityName",
          "TopEntities"."count"
        FROM "TopEntities"
        JOIN "Entity" ON "TopEntities"."entityId" = "Entity"."id"
      `);

      const topFeatures = await ctx.prisma.$queryRawUnsafe<
        Array<{
          featureName: string;
          featureValue: string;
          count: bigint;
        }>
      >(`
        WITH "UniqueEntities" AS (
            SELECT DISTINCT("entityId")
            FROM "EntityAppearancesMatView"
            WHERE
                "datasetId" = ${input.datasetId}
                AND "timestamp" >= to_timestamp(${startTimeInSeconds})
                AND "timestamp" <= to_timestamp(${endTimeInSeconds})
                AND "entityType" = '${input.type}'
                ${input.label ? `AND "entityLabel" = '${input.label}'` : ""}
        )
        SELECT
            feature.key AS "featureName",
            feature.value AS "featureValue",
            COUNT(*) AS "count"
        FROM "UniqueEntities"
        JOIN "Entity" 
          ON "UniqueEntities"."entityId" = "Entity"."id" 
            AND "Entity"."datasetId" = ${input.datasetId}, 
            jsonb_each_text("Entity"."features") AS feature
        GROUP BY
            feature.key, feature.value
        ORDER BY
            count DESC
        LIMIT ${input.limit}
      `);

      const topRelatedEntities = await ctx.prisma.$queryRawUnsafe<
        Array<{
          entityId: string;
          entityType: string;
          entityName: string;
          eventType: string;
          linkType: string;
          count: bigint;
        }>
      >(`
        WITH "RelatedEvents" AS (
            SELECT DISTINCT
                "eventId"
            FROM "EntityAppearancesMatView"
            WHERE 
              "datasetId" = ${input.datasetId}
              AND "timestamp" >= to_timestamp(${startTimeInSeconds})
              AND "timestamp" <= to_timestamp(${endTimeInSeconds})
              AND "entityType" = '${input.type}'
              ${input.label ? `AND "entityLabel" = '${input.label}'` : ""}
        )
        SELECT
            "entityId",
            "Entity"."name" AS "entityName",
            "entityType",
            "linkType",
            "eventType",
            COUNT(*) as "count"
        FROM "RelatedEvents"
        JOIN "EntityAppearancesMatView" 
          ON "RelatedEvents"."eventId" = "EntityAppearancesMatView"."eventId"
          AND "EntityAppearancesMatView"."datasetId" = ${input.datasetId}
        JOIN "Entity" 
          ON "Entity"."id" = "EntityAppearancesMatView"."entityId"
          AND "Entity"."datasetId" = ${input.datasetId}
        WHERE "EntityAppearancesMatView"."entityType" != '${input.type}'
        ${
          input.label
            ? `OR "EntityAppearancesMatView"."entityLabel" != '${input.label}'`
            : ""
        }
        GROUP BY
            "entityId",
            "entityName",
            "entityType",
            "linkType",
            "eventType"
        ORDER BY
            "count" DESC
        LIMIT ${input.limit}
      `);

      function processCountList<TItem extends { count: bigint }>(
        list: TItem[]
      ) {
        const data = list.map((item) => ({
          ...item,
          count: Number(item.count),
        }));

        // Calculate average and std dev
        const average =
          data.reduce((acc, val) => acc + val.count, 0) / data.length;
        const stdDev = Math.sqrt(
          data.reduce((acc, val) => acc + Math.pow(val.count - average, 2), 0) /
            data.length
        );

        return {
          data,
          average,
          stdDev,
        };
      }

      return {
        topEntities: processCountList(topEntities),
        topFeatures: processCountList(topFeatures),
        topRelatedEntities: processCountList(topRelatedEntities),
      };
    }),
  getEventsOfTypeAndLabel: publicProcedure
    .input(
      z.object({
        startTime: z.number(),
        endTime: z.number(),
        type: z.string(),
        label: z.string().optional(),
        eventFilters: eventFiltersZod,
        limit: z.number().default(10),
        datasetId: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const res = await ctx.prisma.event.groupBy({
        by: ["type"],
        take: input.limit,
        where: {
          type: input.eventFilters?.eventType ?? undefined,
          timestamp: {
            gte: new Date(input.startTime),
            lte: new Date(input.endTime),
          },
          eventLabels: {
            some: {
              id: input.label,
            },
          },
          datasetId: input.datasetId,
        },
        orderBy: {
          _count: {
            type: "desc",
          },
        },
      });

      return res;
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

      const { pad, timeBuckets } = await getTimeBuckets(ctx.prisma, {
        startInSeconds,
        endInSeconds,
        intervalInSeconds,
      });

      const whereDatasetIdMatches = {
        where: {
          datasetId: input.datasetId,
        },
      };

      // Get event and entity types
      const [eventLabels, entityLabels, eventTypes, entityTypes] =
        await ctx.prisma.$transaction([
          ctx.prisma.eventLabel.findMany(whereDatasetIdMatches),
          ctx.prisma.entityLabel.findMany(whereDatasetIdMatches),
          ctx.prisma.eventType.findMany(whereDatasetIdMatches),
          ctx.prisma.entityType.findMany(whereDatasetIdMatches),
        ]);

      type BucketProperties = {
        eventType: string;
        linkType: string;
        entityType: string;
        eventLabel: string | null;
        entityLabel: string | null;
      };

      type BucketRow = {
        bucket: Date;
        count: bigint;
      } & BucketProperties;

      const eventType = input.eventFilters?.eventType;

      const eventBucketRows = await ctx.prisma.$queryRaw<Array<BucketRow>>` 
        SELECT
          date_trunc('hour', "Event"."timestamp") AS "bucket",
          "Event"."type" AS "eventType",
          COUNT(DISTINCT "Event"."id") AS "count"
        FROM "EventToEntityLink"
        JOIN "Event" ON "Event"."id" = "EventToEntityLink"."eventId"
        WHERE 
          "Event"."datasetId" = ${input.datasetId}
          ${
            eventType
              ? Prisma.sql`AND "Event"."type" = ${eventType}`
              : Prisma.empty
          }
          AND "Event"."timestamp" >= to_timestamp(${startInSeconds})
          AND "Event"."timestamp" <= to_timestamp(${endInSeconds})
        GROUP BY 
          "bucket", 
          "Event"."type";
      `;

      const eventLabelBucketRows = await ctx.prisma.$queryRaw<Array<BucketRow>>`
        SELECT
            date_trunc('hour', "Event"."timestamp") AS "bucket",
            "Event"."type" AS "eventType",
            "EventLabelToEvent"."eventLabelId" AS "eventLabel",
            COUNT(DISTINCT "Event"."id") AS "count"
        FROM "Event"
        JOIN "EventLabelToEvent" ON "EventLabelToEvent"."eventId" = "Event"."id"
        WHERE 
            "Event"."datasetId" = ${input.datasetId}
            ${
              eventType
                ? Prisma.sql`AND "Event"."type" = ${eventType}`
                : Prisma.empty
            }
            AND "Event"."timestamp" >= to_timestamp(${startInSeconds})
            AND "Event"."timestamp" <= to_timestamp(${endInSeconds})
        GROUP BY
            "bucket",
            "Event"."type",
            "eventLabel";
      `;

      const entityBucketRows = await ctx.prisma.$queryRaw<Array<BucketRow>>`
        SELECT * FROM "EntityTimeBucketsMatView" WHERE "datasetId" = ${input.datasetId}
      `;

      let entityLabelBucketRows;
      entityLabelBucketRows = await ctx.prisma.$queryRaw<Array<BucketRow>>`
        SELECT * FROM "EntityLabelsTimeBucketsMatView" WHERE "datasetId" = ${input.datasetId}
      `;

      function filter(rows: BucketRow[], filters: Partial<BucketProperties>) {
        return rows.filter((row) => {
          if (filters.eventType && row.eventType !== filters.eventType)
            return false;
          if (filters.linkType && row.linkType !== filters.linkType)
            return false;
          if (filters.entityType && row.entityType !== filters.entityType)
            return false;
          if (filters.eventLabel && row.eventLabel !== filters.eventLabel)
            return false;
          if (filters.entityLabel && row.entityLabel !== filters.entityLabel)
            return false;
          return true;
        });
      }

      function getLine(rows: BucketRow[]) {
        const line = pad(
          rows.map((row) => ({
            bucket: row.bucket.getTime(),
            value: Number(row.count),
          }))
        );
        return line;
      }

      const anomalyCharts: MultiLineChart[] = [];

      for (const eventType of eventTypes) {
        const eventTypeRows = filter(eventBucketRows, {
          eventType: eventType.id,
        });
        const totalLine = getLine(eventTypeRows);

        // // For each label, get the percentage of events that have that label
        // for (const eventLabel of eventLabels) {
        //   if (eventLabel.eventType !== eventType.id) {
        //     continue;
        //   }

        //   const eventLabelRows = filter(eventTypeRows, {
        //     eventType: eventType.id,
        //     eventLabel: eventLabel.id,
        //   });

        //   if (eventLabelRows.length === 0) continue;

        //   const labelLine = getLine(eventLabelRows);
        //   const percentageLine = divideLines(labelLine, totalLine);
        //   const title = `% of ${eventType.name} with label ${eventLabel.name}`;
        //   anomalyCharts.push({
        //     title: title,
        //     type: "percent",
        //     lines: [
        //       {
        //         color: eventLabel.color || "gray",
        //         label: title,
        //         data: percentageLine,
        //         ...getStats(percentageLine),
        //         metadata: {
        //           eventType: eventType.id,
        //           eventLabel: eventLabel.id,
        //         },
        //       },
        //     ],
        //   });
        // }

        // for (const entityLabel of entityLabels) {
        //   const entityLabelRows = filter(eventBucketRows, {
        //     eventType: eventType.id,
        //     entityLabel: entityLabel.id,
        //   });

        //   if (entityLabelRows.length === 0) continue;

        //   const entityLabelLine = getLine(entityLabelRows);
        //   const percentageLine = divideLines(entityLabelLine, totalLine);
        //   const title = `% of ${eventType.name} related to entity label ${entityLabel.name}`;
        //   anomalyCharts.push({
        //     title: title,
        //     type: "percent",
        //     lines: [
        //       {
        //         color: entityLabel.color || "gray",
        //         label: title,
        //         data: percentageLine,
        //         ...getStats(percentageLine),
        //         metadata: {
        //           eventType: eventType.id,
        //           entityLabel: entityLabel.id,
        //         },
        //       },
        //     ],
        //   });
        // }
      }

      for (const entityType of entityTypes) {
        const entityTypeRows = filter(entityBucketRows, {
          entityType: entityType.id,
        });
        const totalLine = getLine(entityTypeRows);

        // For each label, get the percentage of events that have that label
        for (const entityLabel of entityLabels) {
          if (entityLabel.entityType !== entityType.id) {
            continue;
          }

          const entityLabelRows = filter(entityLabelBucketRows, {
            entityType: entityType.id,
            entityLabel: entityLabel.id,
          });

          if (entityLabelRows.length === 0) continue;

          const labelLine = getLine(entityLabelRows);
          const percentageLine = divideLines(labelLine, totalLine);
          const title = `% of \`${entityType.name}\` with label \`${entityLabel.name}\``;
          anomalyCharts.push({
            title: title,
            type: "percent",
            lines: [
              {
                color: entityLabel.color || "gray",
                label: title,
                data: percentageLine,
                ...getStats(percentageLine),
                metadata: {
                  entityType: entityType.id,
                  entityLabel: entityLabel.id,
                },
              },
            ],
          });
        }
      }

      const eventLabelLines: Line[] = eventLabels
        .map((eventLabel) => {
          const eventLabelRows = filter(eventLabelBucketRows, {
            eventLabel: eventLabel.id,
            eventType: eventType,
          });
          const line = getLine(eventLabelRows);
          return {
            color: eventLabel.color || "gray",
            label: eventLabel.name,
            data: line,
            ...getStats(line),
          };
        })
        .filter((line) => line.avg > 0);

      const totalEventsLine = getLine(
        filter(eventBucketRows, {
          eventType: eventType,
        })
      );
      return {
        anomalyCharts: anomalyCharts.sort((a, b) => {
          return b.lines[0]!.anomalyCount - a.lines[0]!.anomalyCount;
        }),
        eventChart: {
          title: "Events",
          type: "count",
          lines: [
            {
              color: "blue",
              label: "Events",
              data: totalEventsLine,
              ...getStats(totalEventsLine),
              metadata: {
                isTotal: true,
              },
            },
            ...eventLabelLines,
          ],
        },
      } satisfies {
        anomalyCharts: MultiLineChart[];
        eventChart: MultiLineChart;
      };
    }),
});

type LineItem = {
  bucket: number;
  value: number;
};

type Stats = {
  avg: number;
  stdDev: number;
  anomalyCount: number;
  anomalyRanges: Array<{
    startTime: number;
    endTime: number;
  }>;
};

type Line = {
  color: string;
  label: string;
  data: LineItem[];
  metadata?: Record<string, unknown>;
} & Stats;

type MultiLineChart = {
  title: string;
  type: "count" | "percent";
  lines: Line[];
};

function divideLines(
  numerator: LineItem[],
  denominator: LineItem[]
): LineItem[] {
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

function average(arr: LineItem[]) {
  const nums = arr.map((item) => item.value);
  const sum = nums.reduce((acc, val) => acc + val, 0);
  return sum / nums.length;
}

// Function to calculate standard deviation and detect anomalies
function getStats(arr: LineItem[]) {
  const nums = arr.map((item) => item.value);
  const avg = average(arr);
  const sumOfSquares = nums.reduce(
    (acc, val) => acc + Math.pow(val - avg, 2),
    0
  );

  const stdDev = Math.sqrt(sumOfSquares / nums.length);

  const anomalies = nums.map((num) => {
    return num > avg + 3 * stdDev;
  });

  const anomalyRanges: Array<{
    startTime: number;
    endTime: number;
  }> = [];

  for (let i = 0; i < anomalies.length; i++) {
    if (anomalies[i]) {
      let startRange = i === 0 ? 0 : i - 1;
      let endRange = i + 1;

      // Merge contiguous anomalies into one range
      while (i < anomalies.length - 1 && anomalies[i + 1]) {
        endRange++; // Extend the end of the range
        i++; // Skip the next anomaly index as it is part of the current range
      }

      startRange = Math.min(Math.max(startRange, 0), anomalies.length - 1);
      endRange = Math.max(Math.min(endRange, anomalies.length - 1), 0);

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

async function getTimeBuckets(
  prisma: PrismaClient,
  options: {
    startInSeconds: number;
    endInSeconds: number;
    intervalInSeconds: number;
  }
) {
  const { startInSeconds, endInSeconds, intervalInSeconds } = options;

  const timeBucketsRaw = await prisma.$queryRaw<Array<{ bucket: Date }>>`
    WITH TimeBucketTable AS (
      SELECT generate_series(
          to_timestamp(${startInSeconds}), 
          to_timestamp(${endInSeconds}), 
          interval '1 second' * ${intervalInSeconds}
      ) AS bucket   
    )
    SELECT * FROM TimeBucketTable;
  `;

  // Get line data.
  const timeBuckets = timeBucketsRaw.map((bucket) => bucket.bucket.getTime());
  // Pad empty buckets with 0
  function pad(lineItems: LineItem[]) {
    const filledChart = timeBuckets
      .map((bucket) => {
        const tbItems = lineItems.filter(
          (chart) =>
            chart.bucket >= bucket &&
            chart.bucket < bucket + intervalInSeconds * 1000
        );
        const total = tbItems.reduce((acc, val) => acc + val.value, 0);
        return {
          bucket,
          value: total,
        };
      })
      .slice(0, -1);
    return filledChart;
  }

  return {
    timeBuckets,
    pad,
  };
}

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { JsonFilter, JsonFilterOp } from "../../../shared/jsonFilter";
import { entityFiltersZod, eventFiltersZod } from "../../../shared/validation";
import { get, uniq, uniqBy } from "lodash";
import { getOrderedFeatures } from "~/server/lib/features";

export const listsRouter = createTRPCRouter({
  getEntitiesList: publicProcedure
    .input(
      z.object({
        entityFilters: entityFiltersZod,
        sortBy: z
          .object({
            feature: z.string(),
            direction: z.enum(["asc", "desc"]),
            dataType: z.enum(["text", "number", "boolean"]),
          })
          .optional(),
        limit: z.number().optional(),
        cursor: z.number().optional(),
        datasetId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const filters = input.entityFilters;
      const features = await ctx.prisma.feature.findMany();

      const entityFeatures = await ctx.prisma.entityFeature.findMany({
        include: {
          entityType: true,
        },
      });

      // TODO: Implement sort by
      const result = await db.query({
        query: `
          SELECT 
            entity_id as id,
            entity_type as type,
            max(event_timestamp) AS lastSeenAt
            ${features
              .map(
                (feature) =>
                  `,argMaxIf(JSONExtractString(features, '${feature.feature}'), event_timestamp, JSONExtractString(features, '${feature.feature}') IS NOT NULL) AS ${feature.feature}`
              )
              .join("")}
          FROM event_entity
          WHERE dataset_id = '${input.datasetId}'
          ${
            filters?.entityType
              ? `AND entity_type = '${filters.entityType}'`
              : ""
          }
          ${
            filters?.entityLabels?.length
              ? `AND label IN (${filters.entityLabels
                  .map((label) => `'${label}'`)
                  .join(", ")})`
              : ""
          }
          ${
            filters?.entityFeatures
              ?.map((filter) => getFeatureQuery(filter, "entity_features"))
              .join("\n") ?? ""
          }
          GROUP BY entity_id, entity_type
          ORDER BY ${
            input.sortBy
              ? getFeatureSortKey("features", input.sortBy)
              : "lastSeenAt DESC, entity_id DESC"
          }
          LIMIT ${input.limit ?? 50}
          OFFSET ${input.cursor ?? 0};
        `,
        format: "JSONEachRow",
      });
      const entities = await result.json<
        {
          id: string;
          type: string;
          lastSeenAt: string;
          features: string;
        }[]
      >();

      const entityFeatureNames = features
        .filter((feature) => feature.dataType === "entity")
        .map((feature) => feature.feature);

      const entityTypes = await ctx.prisma.entityType.findMany({
        include: {
          nameFeature: {
            include: {
              feature: true,
            },
          },
        },
      });

      const entityIds = entities.map((entity) => entity.id);
      for (const entity of entities) {
        for (const [feature, value] of Object.entries(entity)) {
          if (value && entityFeatureNames.includes(feature)) {
            entityIds.push(feature);
          }
        }
      }

      const entityTypeToNameFeature = entityTypes.reduce(
        (acc, type) => ({
          ...acc,
          [type.type]: type.nameFeature?.feature.feature,
        }),
        {} as Record<string, string | undefined>
      );

      return {
        count: 0,
        rows: entities.map((entity) => {
          const { id, type, lastSeenAt, ...rest } = entity;
          const entityNameFeature = entityTypeToNameFeature[entity.type];

          return {
            ...entity,
            features: getOrderedFeatures({
              type: "entity",
              eventOrEntity: { type, features: rest },
              eventOrEntityTypes: entityTypes,
              eventOrEntityFeatures: entityFeatures,
              features,
              entityTypes,
              entities,
            }),
            rules: getOrderedFeatures({
              type: "entity",
              eventOrEntity: { type, features: rest },
              eventOrEntityTypes: entityTypes,
              eventOrEntityFeatures: entityFeatures,
              features,
              entityTypes,
              entities,
              isRule: true,
            }),
            // Wait this doesn't work?
            name: entityNameFeature && entity[entityNameFeature],
          };
        }),
      };
    }),

  getEventsList: publicProcedure
    .input(
      z.object({
        eventFilters: eventFiltersZod,
        cursor: z.number().optional(),
        limit: z.number().optional(),
        datasetId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const filters = input.eventFilters;
      const eventTypes = await ctx.prisma.eventType.findMany();
      const eventFeatures = await ctx.prisma.eventFeature.findMany({
        include: {
          eventType: true,
        },
      });
      const features = await ctx.prisma.feature.findMany();

      const result = await db.query({
        query: `
          SELECT 
            event_id,
            type,
            timestamp,
            data,
            features,
            groupArray(entity_id) AS entity_ids,
            groupArray(entity_type) AS entity_types
          FROM events
          WHERE 1 = 1
            ${
              filters?.eventType
                ? `AND event_type = '${filters.eventType}'`
                : ""
            }
            ${
              filters?.eventFeatures
                ?.map((filter) => getFeatureQuery(filter, "features"))
                .join("\n") ?? ""
            }
            ${
              filters?.dateRange
                ? `AND event_timestamp >= ${filters.dateRange.from} AND event_timestamp <= ${filters.dateRange.to}`
                : ""
            }
            ${
              filters?.entityId
                ? `AND event_id IN (
                    SELECT DISTINCT event_id
                    FROM event_entity
                    WHERE entity_id = '${filters.entityId}'
                   )`
                : ""
            }
          GROUP BY
            event_id,
            dataset_id,
            event_type,
            event_data,
            event_timestamp,
            features
          ORDER BY event_timestamp DESC, event_id DESC
          LIMIT ${input.limit ?? 50}
          OFFSET ${input.cursor ?? 0};
        `,
        format: "JSONEachRow",
      });

      type EventResult = {
        event_id: string;
        event_type: string;
        event_data: string;
        event_timestamp: Date;
        features: string;
        entity_ids: string[];
        entity_types: string[];
      };

      const events = await result.json<EventResult[]>();

      const entityTypes = await ctx.prisma.entityType.findMany({
        include: {
          nameFeature: {
            include: {
              feature: true,
            },
          },
        },
      });

      const nameFeatures = uniqBy(
        entityTypes.map((type) => type.nameFeature?.feature).filter(Boolean),
        (feature) => feature?.feature
      );

      const data = await db.query({
        query: `
          SELECT 
            entity_id as id,
            entity_type as type
            ${nameFeatures
              .map(
                (feature) =>
                  `,argMaxIf(JSONExtractString(features, '${feature?.feature}'), event_timestamp, JSONExtractString(features, '${feature?.feature}') IS NOT NULL) AS ${feature.feature}`
              )
              .join("")}
          FROM event_entity
          WHERE dataset_id = '${input.datasetId}'
          ${
            events.some((event) => event.entity_ids.length > 0)
              ? `AND entity_id IN (${uniq(
                  events.flatMap((event) =>
                    event.entity_ids.map((id) => `'${id}'`)
                  )
                ).join(",")})`
              : ""
          }
          GROUP BY 
            entity_id,
            entity_type;
        `,
        format: "JSONEachRow",
      });

      const entities =
        await data.json<
          (Record<string, string> & { id: string; type: string })[]
        >();

      return {
        count: 0,
        rows: events.map((event) => ({
          id: event.event_id,
          type: event.event_type,
          data: JSON.parse(event.event_data),
          features: getOrderedFeatures({
            type: "event",
            eventOrEntity: {
              type: event.event_type,
              features: JSON.parse(event.features),
            },
            eventOrEntityTypes: eventTypes,
            eventOrEntityFeatures: eventFeatures,
            features,
            entityTypes,
            entities,
          }),
          rules: getOrderedFeatures({
            type: "event",
            eventOrEntity: {
              type: event.event_type,
              features: JSON.parse(event.features),
            },
            eventOrEntityTypes: eventTypes,
            eventOrEntityFeatures: eventFeatures,
            features,
            entityTypes,
            entities,
            isRule: true,
          }),
          timestamp: new Date(event.event_timestamp),
        })),
      };
    }),

  // prob doesnt work
  getFeatureColumnsForEventType: publicProcedure
    .input(
      z.object({
        eventType: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const vals = await ctx.prisma.eventFeature.findMany({
        where: {
          eventType: input.eventType,
        },
      });
      return vals;
    }),

  getEvent: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const event = await ctx.prisma.event.findUnique({
        where: {
          id: input.eventId,
        },
        include: {
          eventLabels: true,
          eventType: true,
          entityLinks: {
            include: {
              entity: {
                include: {
                  entityLabels: true,
                },
              },
            },
          },
        },
      });
      return event;
    }),

  getEventsOfType: publicProcedure
    .input(
      z.object({
        eventTypeId: z.string(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [count, rows] = await Promise.all([
        ctx.prisma.event.count({
          where: {
            eventType: {
              id: input.eventTypeId,
            },
          },
        }),
        ctx.prisma.event.findMany({
          where: {
            eventType: {
              id: input.eventTypeId,
            },
          },
          include: {
            eventLabels: true,
            eventType: true,
          },
          orderBy: {
            timestamp: "desc",
          },
          take: input.limit,
          skip: input.offset,
        }),
      ]);
      return {
        count,
        rows,
      };
    }),
});

const getFeatureSortKey = (
  column: string,
  sortBy: {
    feature: string;
    direction: "asc" | "desc";
    dataType: "text" | "number" | "boolean";
  }
) => {
  const { feature, direction, dataType } = sortBy;
  return dataType === "number"
    ? `toInt32OrZero(JSONExtractString(${column}, '${feature}')) ${direction}`
    : `JSONExtractString(${column}, '${feature}') ${direction}`;
};

const getFeatureQuery = (filter: JsonFilter, column: string) => {
  const { path, op, value, dataType } = filter;
  const feature =
    dataType === "number"
      ? `toInt32OrZero(JSONExtractString(${column}, '${path}'))`
      : `JSONExtractString(${column}, '${path}')`;

  if (op === JsonFilterOp.IsEmpty) {
    if (dataType === "text")
      return `AND (${feature} IS NULL OR ${feature} = '')`;
    else return `AND ${feature} IS NULL`;
  }
  if (op === JsonFilterOp.NotEmpty) {
    if (dataType === "text")
      return `AND (${feature} IS NOT NULL AND ${feature} != '')`;
    else return `AND ${feature} IS NOT NULL`;
  }

  if (value === undefined) return "";

  const comparisonOps = {
    [JsonFilterOp.Equal]: "=",
    [JsonFilterOp.NotEqual]: "!=",
    [JsonFilterOp.GreaterThan]: ">",
    [JsonFilterOp.LessThan]: "<",
  };

  if (comparisonOps[op])
    return `AND ${feature} ${comparisonOps[op]} ${
      dataType === "number" ? value : `'${value}'`
    }`;

  const stringOps = {
    [JsonFilterOp.Contains]: `LIKE '%${value}%'`,
    [JsonFilterOp.DoesNotContain]: `NOT LIKE '%${value}%'`,
    [JsonFilterOp.StartsWith]: `LIKE '${value}%'`,
    [JsonFilterOp.EndsWith]: `LIKE '%${value}'`,
  };

  if (stringOps[op]) return `AND ${feature} ${stringOps[op]}`;
};

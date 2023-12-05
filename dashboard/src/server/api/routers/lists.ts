import { Entity, getFeatureDefFromSnapshot } from "event-processing";
import { get, uniq, uniqBy } from "lodash";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getOrderedFeatures } from "~/server/lib/features";
import { JsonFilter, JsonFilterOp } from "../../../shared/jsonFilter";
import { entityFiltersZod, eventFiltersZod } from "../../../shared/validation";

export const listsRouter = createTRPCRouter({
  getEntitiesList: protectedProcedure
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

  getEventsList: protectedProcedure
    .input(
      z.object({
        eventFilters: eventFiltersZod,
        cursor: z.number().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const filters = input.eventFilters;

      const result = await db.query({
        query: `
          WITH entity_appearances AS (
              SELECT event_id, entity_type, entity_id
              FROM features
              WHERE notEmpty(entity_id)
              GROUP BY event_id, entity_type, entity_id
          ), desired_event_ids AS (
              SELECT DISTINCT event_id
              FROM features
              JOIN events ON features.event_id = events.id
          ), event_features AS (
              SELECT
                  event_id,
                  groupArray(tuple(feature_id, value)) AS features_arr
              FROM features
              GROUP BY event_id
          )
          SELECT
            DISTINCT desired_event_ids.event_id as event_id,
            e.type as event_type,
            e.timestamp as event_timestamp,
            e.data as event_data,
            groupArray(tuple(ea.entity_type, ea.entity_id)) OVER (PARTITION BY e.id) AS entities,
            ef.features_arr as features_array
          FROM desired_event_ids
          LEFT JOIN entity_appearances ea ON desired_event_ids.event_id = ea.event_id
          LEFT JOIN events e ON desired_event_ids.event_id = e.id
          LEFT JOIN event_features ef ON desired_event_ids.event_id = ef.event_id
          WHERE event_id IN (SELECT event_id FROM desired_event_ids)
          ORDER BY event_id DESC
          LIMIT ${input.limit ?? 50}
          OFFSET ${input.cursor ?? 0};
        `,
        format: "JSONEachRow",
      });

      type EventResult = {
        event_id: string;
        event_type: string;
        event_timestamp: Date;
        event_data: string;
        entities: Array<[string[], string[]]>;
        features_array: Array<[string, string]>;
      };

      const events = await result.json<EventResult[]>();

      const latestSnapshots = await ctx.prisma.featureDefSnapshot.findMany({
        distinct: ["featureDefId"],
        orderBy: {
          createdAt: "desc",
        },
        include: {
          featureDef: true,
        },
      });

      const featureDefs = latestSnapshots.map((snapshot) =>
        getFeatureDefFromSnapshot({ featureDefSnapshot: snapshot })
      );

      return {
        count: 0,
        rows: events.map((event) => ({
          id: event.event_id,
          type: event.event_type,
          timestamp: new Date(event.event_timestamp),
          data: JSON.parse(event.event_data),
          entities: getUniqueEntities(event.entities),
        })),
      };
    }),

  // prob doesnt work
  getFeatureColumnsForEventType: protectedProcedure
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

  getEvent: protectedProcedure
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

  getEventsOfType: protectedProcedure
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

function getUniqueEntities(
  entities_array: Array<[string[], string[]]>
): Entity[] {
  const entities: Entity[] = [];
  for (const [entity_types, entity_ids] of entities_array) {
    for (let i = 0; i < entity_ids.length; i++) {
      const entity_id = entity_ids[i];
      const entity_type = entity_types[i];
      const found = entities.some(
        (entity) => entity.id === entity_id && entity.type === entity_type
      );
      if (found) {
        continue;
      }
      if (!entity_id || !entity_type) {
        throw new Error("Invalid entity array from clickhouse");
      }
      entities.push({ id: entity_id, type: entity_type });
    }
  }
  return entities;
}

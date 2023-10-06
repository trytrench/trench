import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { JsonFilter, JsonFilterOp } from "../../../shared/jsonFilter";
import { entityFiltersZod, eventFiltersZod } from "../../../shared/validation";

export const listsRouter = createTRPCRouter({
  getEntitiesList: publicProcedure
    .input(
      z.object({
        entityFilters: entityFiltersZod,
        sortBy: z
          .object({
            feature: z.string(),
            direction: z.enum(["asc", "desc"]),
            dataType: z.enum(["string", "number", "boolean"]),
          })
          .optional(),
        limit: z.number().optional(),
        cursor: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const filters = input.entityFilters;

      // TODO: Implement sort by
      const result = await db.query({
        query: `
          SELECT 
            entity_id as id,
            entity_type as type,
            entity_name as name,
            max(event_timestamp) AS lastSeenAt,
            argMax(entity_features, event_timestamp) AS features,
            arrayDistinct(groupArray(label)) AS labels
          FROM event_entity_entity_labels
          WHERE 1=1
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
          GROUP BY entity_id, entity_type, entity_name
          ORDER BY ${
            input.sortBy
              ? getFeatureSortKey("features", input.sortBy)
              : "lastSeenAt DESC"
          }
          LIMIT ${input.limit ?? 50}
          OFFSET ${input.cursor ?? 0};
        `,
        format: "JSONEachRow",
      });
      const entities = await result.json<
        {
          id: string;
          name: string;
          type: string;
          lastSeenAt: string;
          features: string;
          labels: string[];
        }[]
      >();

      return {
        count: 0,
        rows: entities
          .filter((entity) => entity.id)
          .map((entity) => ({
            ...entity,
            features: JSON.parse(entity.features),
          })),
      };
    }),

  getEventsList: publicProcedure
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
          SELECT 
            event_id,
            event_type,
            event_data,
            event_timestamp,
            event_features,
            groupArray(entity_id) AS entity_ids,
            groupArray(entity_type) AS entity_types,
            groupArray(entity_name) AS entity_names,
            groupArray(entity_relation) AS entity_relations,
            groupArray(entity_features) AS entity_features,
            arrayDistinct(groupArray(label)) AS event_labels
          FROM event_entity_event_labels
          WHERE 1=1
            ${
              filters?.eventType
                ? `AND event_type = '${filters.eventType}'`
                : ""
            }
            ${
              filters?.eventLabels?.length
                ? `AND label IN (${filters.eventLabels
                    .map((label) => `'${label}'`)
                    .join(", ")})`
                : ""
            }
            ${
              filters?.eventFeatures
                ?.map((filter) => getFeatureQuery(filter, "event_features"))
                .join("\n") ?? ""
            }
            ${
              filters?.entityId
                ? `AND event_id IN (
                    SELECT DISTINCT event_id
                    FROM event_entity_event_labels
                    WHERE entity_id = '${filters.entityId}'
                   )`
                : ""
            }
          GROUP BY
            event_id,
            event_type,
            event_data,
            event_timestamp,
            event_features
          ORDER BY event_timestamp DESC
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
        event_features: string;
        event_labels: string[];
        entity_ids: string[];
        entity_names: string[];
        entity_types: string[];
        entity_features: string[];
        entity_relations: string[];
      };

      const events = await result.json<EventResult[]>();

      return {
        count: 0,
        rows: events.map((event) => ({
          id: event.event_id,
          type: event.event_type,
          data: JSON.parse(event.event_data),
          features: JSON.parse(event.event_features),
          timestamp: new Date(event.event_timestamp),
          labels: event.event_labels,
          entities: event.entity_ids.filter(Boolean).map((id, index) => {
            return {
              id: id,
              type: event.entity_types[index],
              name: event.entity_names[index],
              relation: event.entity_relations[index],
              // features: JSON.parse(event.entity_features[index]),
              labels: [],
            };
          }),
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
    dataType: "string" | "number" | "boolean";
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

  if (op === JsonFilterOp.IsEmpty)
    return `AND (${feature} IS NULL OR ${feature} = '')`;
  if (op === JsonFilterOp.NotEmpty)
    return `AND (${feature} IS NOT NULL AND ${feature} != '')`;

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

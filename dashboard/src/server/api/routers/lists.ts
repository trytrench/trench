import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { entityFiltersZod, eventFiltersZod } from "../../../shared/validation";
import {
  JsonFilter,
  JsonFilterOp,
  parseValue,
} from "../../../shared/jsonFilter";
import {
  buildEntityExistsQuery,
  buildEventExistsQuery,
  getEntityExistsSubqueries,
  getFiltersWhereQuery,
} from "../../lib/filters";
import { Entity, PrismaClient } from "@prisma/client";
import { db } from "~/server/db";

export const listsRouter = createTRPCRouter({
  getEntitiesList: publicProcedure
    .input(
      z.object({
        entityFilters: entityFiltersZod,
        sortBy: z.object({
          feature: z.string(),
          direction: z.enum(["asc", "desc"]),
          dataType: z.enum(["string", "number", "boolean"]).optional(),
        }),
        limit: z.number().optional(),
        cursor: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const filters = input.entityFilters;
      const hasLabelFilter = !!filters?.entityLabels?.length;

      // TODO: Implement sort by
      const entityIdsSubquery = `
        SELECT entity_id
        FROM ${hasLabelFilter ? "entity_labels" : "event_entity"}
        WHERE 1=1
        ${
          filters?.entityType ? `AND entity_type = '${filters.entityType}'` : ""
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
        GROUP BY entity_id
        LIMIT ${input.limit ?? 50}
        OFFSET ${input.cursor ?? 0}
      `;

      const result = await db.query({
        query: `
          WITH entity_ids AS (
            ${entityIdsSubquery}
          ),

          filtered_entity_labels AS (
            SELECT entity_id, 
            arrayDistinct(groupArray(label)) AS labels
            FROM entity_labels
            WHERE entity_id IN (SELECT entity_id FROM entity_ids)
            GROUP BY entity_id
          ),

          filtered_event_entity AS (
            SELECT
              entity_id,
              entity_type,
              entity_name,
              max(event_timestamp) AS lastSeenAt,
              argMax(entity_features, event_timestamp) AS features
            FROM event_entity
            WHERE entity_id IN (SELECT entity_id FROM entity_ids)
            GROUP BY entity_id, entity_type, entity_name
          )

          SELECT 
            entity_id as id,
            entity_type as type,
            entity_name as name,
            lastSeenAt,
            features,
            labels
          FROM filtered_event_entity
          LEFT JOIN filtered_entity_labels ON filtered_event_entity.entity_id = filtered_entity_labels.entity_id
          ORDER BY lastSeenAt DESC;
        `,
        format: "JSONEachRow",
      });
      const entities = await result.json<
        {
          id: string;
          name: string;
          type: string;
          lastSeenAt: string;
          features: Record<string, any>[];
          labels: string[];
        }[]
      >();

      return {
        count: 0,
        rows: entities,
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
      const hasLabelFilter = !!filters?.eventLabels?.length;

      const eventIdsSubquery = `
          SELECT event_id
          FROM ${hasLabelFilter ? "event_labels" : "event_entity"}
          WHERE 1=1
          ${filters?.eventType ? `AND event_type = '${filters.eventType}'` : ""}
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
          GROUP BY event_id, event_timestamp
          ORDER BY event_timestamp DESC
          LIMIT ${input.limit ?? 50} 
          OFFSET ${input.cursor ?? 0}
        `;

      const query = `
        WITH event_ids AS (
          ${eventIdsSubquery}
        ),

        filtered_event_labels AS (
          SELECT event_id, 
          groupArray(label) AS labels
          FROM event_labels
          WHERE event_id IN (SELECT event_id FROM event_ids)
          GROUP BY event_id
        ),

        filtered_event_entity AS (
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
            groupArray(entity_features) AS entity_features
          FROM event_entity AS e
          WHERE e.event_id IN (
            SELECT event_id FROM event_ids
          )
          GROUP BY
            event_id,
            event_type,
            event_data,
            event_timestamp,
            event_features
          ORDER BY event_timestamp DESC
        )

        SELECT 
          event_id,
          event_type,
          event_data,
          event_timestamp,
          event_features,
          entity_ids,
          entity_types,
          entity_names,
          entity_relations,
          entity_features,
          labels AS event_labels
        FROM filtered_event_entity
        LEFT JOIN filtered_event_labels ON filtered_event_entity.event_id = filtered_event_labels.event_id
        ORDER BY event_timestamp DESC;
      `;

      const result = await db.query({
        query,
        format: "JSONEachRow",
      });
      const events = await result.json<
        {
          event_id: string;
          event_type: string;
          event_data: string;
          event_timestamp: Date;
          event_features: Record<string, any>;
          event_labels: string[];
          entity_ids: string[];
          entity_names: string[];
          entity_types: string[];
          entity_features: Record<string, any>[];
          entity_relations: string[];
        }[]
      >();

      return {
        count: 0,
        rows: events.map((event) => ({
          id: event.event_id,
          type: event.event_type,
          data: event.event_data,
          features: event.event_features,
          timestamp: new Date(event.event_timestamp),
          labels: event.event_labels,
          entities: event.entity_ids.map((id, index) => {
            return {
              id: id,
              type: event.entity_types[index],
              name: event.entity_names[index],
              relation: event.entity_relations[index],
              features: event.entity_features[index],
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

const getFeatureQuery = (filter: JsonFilter, column: string) => {
  const { path, op, value, dataType } = filter;
  if (op === JsonFilterOp.IsEmpty)
    return `AND ${column}.${path} IS NULL OR ${column}.${path} = ''`;
  if (op === JsonFilterOp.NotEmpty)
    return `AND ${column}.${path} IS NOT NULL AND ${column}.${path} != ''`;

  const comparisonOps = {
    [JsonFilterOp.Equal]: "=",
    [JsonFilterOp.NotEqual]: "!=",
    [JsonFilterOp.GreaterThan]: ">",
    [JsonFilterOp.LessThan]: "<",
  };

  if (comparisonOps[op])
    return `AND (${column}.${path})${
      dataType === "number" ? "::NUMERIC" : ""
    } ${comparisonOps[op]} ${dataType === "number" ? value : `'${value}'`}`;

  const stringOps = {
    [JsonFilterOp.Contains]: `LIKE '%${value}%'`,
    [JsonFilterOp.DoesNotContain]: `NOT LIKE '%${value}%'`,
    [JsonFilterOp.StartsWith]: `LIKE '${value}%'`,
    [JsonFilterOp.EndsWith]: `LIKE '%${value}'`,
  };

  if (stringOps[op]) return `AND ${column}.${path} ${stringOps[op]}`;
};

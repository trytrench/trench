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
        offset: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const filters = input.entityFilters;

      const result = await db.query({
        query: `
          SELECT
            e.entity_id as id,
            e.entity_type as type,
            e.entity_name as name,
            max(e.event_timestamp) AS lastSeenAt,
            argMax(e.entity_features, e.event_timestamp) AS features
          FROM event_entity AS e
          WHERE e.entity_id IN (
              SELECT entity_id
              FROM event_entity
              GROUP BY entity_id
              ORDER BY max(event_timestamp) DESC
              LIMIT 30
          )
          GROUP BY
            e.entity_id,
            e.entity_type,
            e.entity_name
          ORDER BY lastSeenAt DESC
        `,
        format: "JSONEachRow",
      });
      const entities = await result.json<
        {
          id: string;
          name: string;
          type: string;
          features: Record<string, any>[];
        }[]
      >();

      return {
        count: 0,
        rows: entities.map((entity) => ({
          ...entity,
          labels: [],
        })),
      };

      const [count, rows] = await Promise.all([
        ctx.prisma.entity.count({
          // where: {
          //   entityType: {
          //     id: input.entityFilters?.entityType,
          //   },
          // },
        }),
        getFilteredEntities(
          ctx.prisma,
          input.entityFilters?.entityType,
          input.entityFilters?.entityLabels,
          input.entityFilters?.entityFeatures,
          input.limit,
          input.offset,
          input.sortBy
        ),
      ]);
      return {
        count,
        rows,
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
          AND (event_type = '${filters?.eventType}' OR 1=1)
          ${
            filters?.eventLabels?.length
              ? `AND label IN (${filters.eventLabels
                  .map((label) => `'${label}'`)
                  .join(", ")})`
              : ""
          }
          ${filters?.eventFeatures
            ?.map((filter) => getFeatureQuery(filter, "event_features"))
            .join("\n")}
          GROUP BY event_id, event_timestamp
          ORDER BY event_timestamp DESC
          LIMIT ${input.limit ?? 50} 
          OFFSET ${input.cursor ?? 0}
        `;
      console.log(eventIdsSubquery);

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

async function getFilteredEntities(
  prisma: PrismaClient,
  entityType?: string,
  entityLabels?: string[],
  entityFeatures?: JsonFilter[],
  limit?: number,
  offset?: number,
  sortBy?: {
    feature: string;
    direction: "asc" | "desc";
    dataType?: "string" | "number";
  }
) {
  const features = entityFeatures
    ? getFeatureQuery(entityFeatures, `"Entity"."features"`)
    : "";

  const orderByFeature = sortBy?.feature
    ? `("Entity"."features"->>'${sortBy.feature}')${
        sortBy.dataType === "number" ? "::NUMERIC" : ""
      } ${sortBy.direction}`
    : `matViewSubquery."timestamp" DESC`;

  const rawResults = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      name: string;
      type: string;
      features: Record<string, any>;
      labels: Array<{
        id: string;
        name: string;
        color: string;
      }>;
      lastSeenAt: Date;
    }>
  >(`
    SELECT
      "Entity"."id" as "id",
      "Entity"."name" as "name",
      "Entity"."type" as "type",
      "Entity"."features" as "features",
      JSON_AGG(
        json_build_object(
          'id', "_EntityToEntityLabel"."B",
          'name', "EntityLabel"."name",
          'color', "EntityLabel"."color"
        )
      ) as "labels",
      matViewSubquery."timestamp" as "lastSeenAt"
    FROM "Entity"
    LEFT JOIN (
      SELECT "entityId", MAX("timestamp") as "timestamp"
      FROM "EntityAppearancesMatView"
      GROUP BY "entityId"
    ) as matViewSubquery ON "Entity"."id" = matViewSubquery."entityId"
    LEFT JOIN "_EntityToEntityLabel" ON "Entity"."id" = "_EntityToEntityLabel"."A"
    LEFT JOIN "EntityLabel" ON "_EntityToEntityLabel"."B" = "EntityLabel"."id"
    WHERE TRUE
      ${entityType ? `AND "Entity"."type" = '${entityType}'` : ""}
      ${
        entityLabels?.length
          ? entityLabels
              .map((label) => {
                return `AND EXISTS (
              SELECT FROM "EntityAppearancesMatView"
              WHERE "EntityAppearancesMatView"."entityId" = "Entity"."id"
              AND "EntityAppearancesMatView"."entityLabel" = '${label}'
            )`;
              })
              .join("\n")
          : ""
      }
      ${features}
    GROUP BY
      "Entity"."id",
      "Entity"."type",
      "Entity"."features",
      matViewSubquery."timestamp"
    ORDER BY ${orderByFeature}
    LIMIT ${limit ?? 10}
    OFFSET ${offset ?? 0}
  `);

  // Do some additional client-side processing here if needed

  return rawResults.map((row) => {
    return {
      ...row,
      labels: row.labels,
    };
  });
}

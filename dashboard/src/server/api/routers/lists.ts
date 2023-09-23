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
  getEntityExistsSubqueries,
  getFiltersWhereQuery,
} from "../../lib/filters";
import { Entity, Prisma, PrismaClient } from "@prisma/client";
import { AND_EVENT_MATCHES_FILTERS } from "~/server/lib/rawSQLHelpers";

export const listsRouter = createTRPCRouter({
  getEntitiesList: publicProcedure
    .input(
      z.object({
        entityFilters: entityFiltersZod,
        sortBy: z
          .object({
            feature: z.string().optional(),
            direction: z.enum(["asc", "desc"]).optional(),
          })
          .optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
        datasetId: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const filters = input.entityFilters;
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
          input.datasetId,
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
        cursor: z.string().optional(),
        limit: z.number().optional(),
        datasetId: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const filters = input.eventFilters;

      const cursor = input.cursor;

      const [count, rows] = await Promise.all([
        ctx.prisma.event.count({
          where: {
            ...getFiltersWhereQuery(input.eventFilters),
            datasetId: input.datasetId,
          },
        }),
        ctx.prisma.$queryRaw<
          Array<{
            id: string;
            type: string;
            data: string;
            timestamp: Date;
            labels: Array<{
              id: string;
              name: string;
              color: string;
            }>;
          }>
        >`
          SELECT
            "Event"."id" as "id",
            "Event"."type" as "type",
            "Event"."data" as "data",
            "Event"."timestamp" as "timestamp",
            JSON_AGG(
              json_build_object(
                'id', "EventLabelToEvent"."eventLabelId",
                'name', "EventLabel"."name",
                'color', "EventLabel"."color"
              )
            ) as "labels"
          FROM "Event"
          LEFT JOIN "EventLabelToEvent" ON "Event"."id" = "EventLabelToEvent"."eventId"
          LEFT JOIN "EventLabel" ON "EventLabelToEvent"."eventLabelId" = "EventLabel"."id"
          WHERE 
            "Event"."datasetId" = ${input.datasetId}
            ${AND_EVENT_MATCHES_FILTERS(input.datasetId, input.eventFilters)} ${
          cursor
            ? Prisma.sql`AND "Event"."timestamp" <= ${Prisma.raw(cursor)}`
            : Prisma.empty
        }
          GROUP BY
            "Event"."id",
            "Event"."type",
            "Event"."data",
            "Event"."timestamp"
          ORDER BY "Event"."timestamp" DESC
          LIMIT ${input.limit ?? 10}
        `,
      ]);

      return {
        count,
        rows: rows.map((row) => {
          return {
            ...row,
            labels: row.labels.filter((label) => label.id !== null),
          };
        }),
      };
    }),

  getEvent: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        datasetId: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const event = await ctx.prisma.event.findUnique({
        where: {
          id: input.eventId,
          datasetId: input.datasetId,
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
});

async function getFilteredEntities(
  prisma: PrismaClient,
  datasetId: number,
  entityType?: string,
  entityLabels?: string[],
  entityFeatures?: JsonFilter[],
  limit?: number,
  offset?: number,
  sortBy?: { feature: string; direction: "asc" | "desc" }
) {
  const features =
    entityFeatures
      ?.map(({ path, op, value }) => {
        const parsedValue = parseValue(value);
        const sqlOperator = {
          [JsonFilterOp.Equal]: "=",
          [JsonFilterOp.NotEqual]: "!=",
          [JsonFilterOp.GreaterThanOrEqual]: ">=",
          [JsonFilterOp.LessThanOrEqual]: "<=",
        }[op];

        return `AND "Entity"."features"->>'${path}' ${sqlOperator} '${parsedValue}'`;
      })
      .join(" ") ?? "";
  const showFeatures = entityFeatures?.length ? true : false;

  const orderByFeature = sortBy?.feature
    ? `"Entity"."features"->>'${sortBy.feature}' ${sortBy.direction}`
    : `matViewSubquery."timestamp" DESC`;

  const rawResults = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      name: string;
      type: string;
      features: string;
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
          'id', "EntityLabelToEntity"."entityLabelId",
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
    LEFT JOIN "EntityLabelToEntity" ON "Entity"."id" = "EntityLabelToEntity"."entityId"
    LEFT JOIN "EntityLabel" ON "EntityLabelToEntity"."entityLabelId" = "EntityLabel"."id"
    WHERE "Entity"."datasetId" = ${datasetId}
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
      ${showFeatures ? `${features}` : ""}
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

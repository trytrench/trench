import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { entityFiltersZod } from "../../../shared/validation";
import {
  JsonFilter,
  JsonFilterOp,
  parseValue,
} from "../../../shared/jsonFilter";
import {
  buildEntityExistsQuery,
  getEntityExistsSubqueries,
} from "../../lib/filters";
import { Entity, PrismaClient } from "@prisma/client";

export const listsRouter = createTRPCRouter({
  getEntitiesList: publicProcedure
    .input(
      z.object({
        entityFilters: entityFiltersZod,
        limit: z.number().optional(),
        offset: z.number().optional(),
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
          input.entityFilters?.entityType,
          input.entityFilters?.entityLabels,
          input.entityFilters?.entityFeatures,
          input.limit,
          input.offset
        ),
      ]);
      return {
        count,
        rows,
      };
    }),

  getAllEventTypes: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.eventType.findMany();
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

async function getFilteredEntities(
  prisma: PrismaClient,
  entityType?: string,
  entityLabels?: string[],
  entityFeatures?: JsonFilter[],
  limit?: number,
  offset?: number
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
    WITH "ResultEntityIds" AS (
      SELECT
        "entityId",
        MAX("timestamp") as "lastSeenAt"
      FROM "EntityAppearancesMatView"
      WHERE TRUE
        ${entityType ? `AND "entityType" = '${entityType}'` : ""}
        ${
          entityLabels?.length
            ? entityLabels
                .map((label) => {
                  return `AND EXISTS (
                SELECT FROM "_EntityToEntityLabel"
                WHERE "_EntityToEntityLabel"."A" = "entityId"
                AND "_EntityToEntityLabel"."B" = '${label}'
              )`;
                })
                .join("\n")
            : ""
        }
        ${showFeatures ? `${features}` : ""}
      GROUP BY 
        "entityId"
      ORDER BY "lastSeenAt" DESC
      LIMIT ${limit ?? 10}
      OFFSET ${offset ?? 0}
    )
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
      "ResultEntityIds"."lastSeenAt" as "lastSeenAt"
    FROM "ResultEntityIds"
    JOIN "Entity" ON "Entity"."id" = "ResultEntityIds"."entityId"
    LEFT JOIN "_EntityToEntityLabel" ON "Entity"."id" = "_EntityToEntityLabel"."A"
    LEFT JOIN "EntityLabel" ON "_EntityToEntityLabel"."B" = "EntityLabel"."id"
    GROUP BY
      "Entity"."id",
      "Entity"."type",
      "Entity"."features",
      "ResultEntityIds"."lastSeenAt"
    ORDER BY "ResultEntityIds"."lastSeenAt" DESC;
  `);

  // Do some additional client-side processing here if needed

  return rawResults.map((row) => {
    return {
      ...row,
      labels: row.labels.filter((label) => label.id !== null),
    };
  });
}

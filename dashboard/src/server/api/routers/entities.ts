import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  entityFiltersZod,
  eventFiltersZod,
  findTopEntitiesArgs,
} from "../../../shared/validation";
import {
  buildEntityExistsQuery,
  buildEventExistsQuery,
  getFiltersWhereQuery,
} from "../../lib/filters";

export const entitiesRouter = createTRPCRouter({
  findIds: publicProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.entity.findMany({
        where: {
          id: {
            in: input.ids,
          },
        },
      });
    }),

  findEvents: publicProcedure
    .input(
      z.object({
        entityId: z.string(),
        offset: z.number().optional(),
        limit: z.number().optional(),
        filters: eventFiltersZod.optional(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.event.findMany({
        include: {
          eventLabels: true,
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
        where: {
          entityLinks: {
            some: {
              // type: "Actor",
              entityId: input.entityId,
            },
          },
          ...getFiltersWhereQuery(input.filters),
        },
        skip: input.offset,
        take: input.limit,
        orderBy: {
          timestamp: "desc",
        },
      });
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

      const bucketsFromDB = await ctx.prisma.$queryRawUnsafe<
        Array<{
          bucket: number;
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
      )
      SELECT
          tb.bucket AS bucket,
          COUNT(DISTINCT entities."entityId") AS count
      FROM
          TimeBucketTable AS tb
      LEFT JOIN entities
          ON
          entities."timestamp" >= tb.bucket AND
          entities."timestamp" < tb.bucket + INTERVAL '1 second' * ${intervalInSeconds}
      GROUP BY
          tb.bucket
      ORDER BY
          tb.bucket;
      `);

      return bucketsFromDB
        .map((bucket) => ({
          bucket: bucket.bucket,
          count: Number(bucket.count),
        }))
        .slice(0, -1);
    }),

  findTop: publicProcedure
    .input(findTopEntitiesArgs)
    .query(async ({ ctx, input }) => {
      const topEntities = await ctx.prisma.$queryRawUnsafe<
        Array<{
          id: string;
          type: string;
          name: string;
          count: number;
        }>
      >(`
        WITH links AS (
          SELECT 
            "EventToEntityLink"."entityId",
            "EventToEntityLink"."eventId"
          FROM "EventToEntityLink"
          WHERE 1 = 1
          ${
            input.linkType
              ? `AND "EventToEntityLink"."type" = '${input.linkType}'`
              : ""
          }
          AND ${buildEventExistsQuery(
            input.eventFilters,
            '"EventToEntityLink"."eventId"'
          )}
        ),
        rows AS (
          SELECT 
            "links"."entityId" AS "id",
            COUNT(*) AS "count"
          FROM "links"
          GROUP BY "links"."entityId"
          ORDER BY COUNT(*) DESC
        ),
        entities AS (
          SELECT
            "rows"."id",
            "count"
          FROM "rows"
          WHERE ${buildEntityExistsQuery(input.entityFilters, '"rows"."id"')}
        )
        SELECT
          "Entity"."id",
          "Entity"."type",
          "Entity"."name",
          "entities"."count"
        FROM "entities"
        JOIN "Entity" ON "Entity"."id" = "entities"."id"
        ORDER BY "entities"."count" DESC
        LIMIT ${input.limit ?? 5}
      `);

      return topEntities.map((entity) => ({
        ...entity,
        count: Number(entity.count),
      }));
    }),
  findMany: publicProcedure
    .input(
      z.object({
        offset: z.number().optional(),
        limit: z.number().optional(),
        filters: z
          .object({
            type: z.string().optional(),
          })
          .optional(),
        orderBy: z
          .object({
            eventsCount: z.enum(["asc", "desc"]).optional(),
          })
          .optional(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.entity.findMany({
        include: {
          entityLabels: true,
        },
        where: {
          type: input.filters?.type,
        },
        skip: input.offset,
        take: input.limit,
        orderBy: {
          eventLinks: {
            _count: input.orderBy?.eventsCount,
          },
        },
      });
    }),

  get: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.entity.findUnique({
        where: {
          id: input.id,
        },
        include: {
          entityLabels: true,
        },
      });
    }),

  findRelatedEntities: publicProcedure
    .input(
      z.object({
        id: z.string(),
        entityType: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const relatedEntities = await ctx.prisma.$queryRawUnsafe<
        Array<{
          id: string;
          type: string;
          name: string;
          linkCount: number;
          entityLabels: Array<string>;
        }>
      >(`
        SELECT
            "Entity"."id",
            "Entity"."type",
            "Entity"."name",
            "EntityType"."name" AS "type_name",
            COUNT(DISTINCT "LinkToInput"."eventId") AS "linkCount",
            ARRAY_AGG(DISTINCT "EntityLabel"."name" || '|' || "EntityLabel"."color") AS "entityLabels"
        FROM
            "Entity"
        JOIN
            "EntityType" ON "Entity"."type" = "EntityType"."id"
        JOIN
            "EventToEntityLink" ON "EventToEntityLink"."entityId" = "Entity"."id"
        JOIN
            "Event" ON "Event"."id" = "EventToEntityLink"."eventId"
        LEFT JOIN
            "EventToEntityLink" AS "LinkToInput" ON "LinkToInput"."eventId" = "Event"."id" AND "LinkToInput"."entityId" = '${input.id}'
        LEFT JOIN
            "_EntityToEntityLabel" ON "Entity"."id" = "_EntityToEntityLabel"."A"
        LEFT JOIN
            "EntityLabel" ON "_EntityToEntityLabel"."B" = "EntityLabel"."id"
        WHERE
            "Entity"."id" != '${input.id}'
            AND "EntityType"."name" = '${input.entityType}'
            AND EXISTS (
                SELECT 1
                FROM "EventToEntityLink" AS "SubLink"
                WHERE
                    "SubLink"."eventId" = "Event"."id" AND "SubLink"."entityId" = '${input.id}'
            )
        GROUP BY
            "Entity"."id", "Entity"."type", "Entity"."name", "EntityType"."name"
        ORDER BY
            COUNT(DISTINCT "EntityLabel"."id") DESC,
            COUNT(DISTINCT "LinkToInput"."eventId") DESC;

  
      `);

      return relatedEntities.map((entity) => ({
        ...entity,
        linkCount: Number(entity.linkCount),
        entityLabels: entity.entityLabels.flatMap((label) => {
          if (!label) return [];
          const arr = label.split("|");
          return [
            {
              name: arr[0] ?? "",
              color: arr[1] ?? "",
            },
          ];
        }),
      }));
    }),
});

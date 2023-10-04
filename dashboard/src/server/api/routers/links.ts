import { groupBy, uniqBy } from "lodash";
import { it } from "node:test";
import { z } from "zod";
import { Link } from "~/pages/links/types";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const linksRouter = createTRPCRouter({
  entityInfo: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const query = `
        SELECT
          e.entity_id as id,
          e.entity_type as type,
          e.entity_name as name
        FROM event_entity AS e
        WHERE e.entity_id = '${input.id}'
        LIMIT 1
      `;

      const res = await db.query({
        query,
      });
      const data = await res.json<{
        data: {
          eventId: string;
          id: string;
          name: string;
          type: string;
          lastSeenAt: Date;
        }[];
      }>();
      return data.data[0];
    }),

  relatedEntities2: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const leftSideQuery = `
        WITH leftIds AS (
          SELECT
            e.entity_id as leftId
          FROM event_entity AS e 
          WHERE e.event_id IN (
              SELECT event_id
              FROM event_entity
              WHERE entity_id = '${input.id}'
              GROUP BY event_id
          )
          GROUP BY e.entity_id
        ),
        counts AS (
          SELECT
            e.entity_id as id,
            e.entity_type as type,
            e.entity_name as name,
            COUNT(e.event_id) as count
          FROM event_entity AS e
          WHERE e.event_id IN (
              SELECT leftId FROM leftIds
          )
          GROUP BY e.entity_id, e.entity_type, e.entity_name
        ),
        SELECT * FROM counts
        ORDER BY counts.count DESC
        LIMIT 15
      `;

      const res = await db.query({
        query: leftSideQuery,
      });

      const data = await res.json<{
        data: {
          id: string;
          name: string;
          type: string;
          count: number;
        }[];
      }>();

      return data.data;
    }),

  relatedEntities: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Gets all entities that are linked to the input entity
      // i.e. They appeared in the same event.
      const leftSideQuery = `
        SELECT
          e.event_id as eventId,
          e.entity_id as id,
          e.entity_type as type,
          e.entity_name as name
        FROM event_entity AS e
        WHERE e.event_id IN (
            SELECT event_id
            FROM event_entity
            WHERE entity_id = '${input.id}'
            GROUP BY event_id
        )
      `;

      const allLinksQuery = `
        WITH leftSide AS (
          ${leftSideQuery}
        ),
        relevantEvents AS (
          SELECT e.event_id as eventId
          FROM event_entity AS e
          WHERE e.event_id IN (
              SELECT event_id
              FROM event_entity
              WHERE entity_id IN (
                SELECT id
                FROM leftSide
              )
              GROUP BY event_id
          )
          GROUP BY e.event_id
        ),
        entityType AS (
          SELECT entity_type
          FROM event_entity
          WHERE entity_id = '${input.id}'
          LIMIT 1
        )

        SELECT
          e.event_id as eventId,
          e.entity_id as id,
          e.entity_type as type,
          e.entity_name as name
        FROM event_entity AS e
        WHERE 
          (
            e.entity_type = (SELECT entity_type FROM entityType)
            OR e.entity_id IN (
              SELECT id
              FROM leftSide
            )
          )
          AND e.entity_id != '${input.id}'
          AND e.event_id IN (
            SELECT eventId
            FROM relevantEvents
          )
        GROUP BY e.event_id, e.entity_id, e.entity_type, e.entity_name
      `;

      const [leftSideResult, allLinksResult] = await Promise.all([
        db.query({
          query: leftSideQuery,
        }),
        db.query({
          query: allLinksQuery,
        }),
      ]);

      // entities that share an event with the input entity
      const entities = await leftSideResult.json<{
        data: {
          id: string;
          name: string;
          type: string;
        }[];
      }>();

      // all events that involve an entity that shares an event with above entities
      const allLinks = await allLinksResult.json<{
        data: {
          eventId: string;
          id: string;
          name: string;
          type: string;
          lastSeenAt: Date;
        }[];
      }>();

      const entityType =
        entities.data.find((item) => item.id === input.id)?.type ?? "";

      const leftSide = uniqBy(entities.data, (item) => item.id).filter(
        (item) => item.id !== input.id
      );
      let rightSide = [] as typeof leftSide;

      // extracting the actual links from "allLinks" is done on the clientside.
      // for all leftSide entities, find all events that they're in. Then find
      // all entities that are in those events, grouping by entity id.

      let links = [] as Link[];

      const leftSideIds = leftSide.map((item) => item.id);

      const byEvent = groupBy(allLinks.data, (item) => item.eventId);
      Object.entries(byEvent).forEach(([eventId, involved]) => {
        const theLeftSideOne = involved.find((item) =>
          leftSideIds.includes(item.id)
        );
        if (!theLeftSideOne) return;
        const theRest = involved.filter(
          (item) => item.id !== theLeftSideOne.id && item.type === entityType
        );

        theRest.forEach((item) => {
          links.push({
            from: theLeftSideOne.id,
            to: item.id,
          });

          // uhhhh
          rightSide.push(item);
        });
      });

      rightSide = uniqBy(rightSide, (item) => item.id);

      return {
        leftSide,
        rightSide,
        links: uniqBy(links, (item) => `${item.from}-${item.to}`),
      };
    }),
});

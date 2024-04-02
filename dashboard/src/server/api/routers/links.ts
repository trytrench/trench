import { Entity } from "event-processing";
import { uniq, uniqBy, uniqueId } from "lodash";
import { z } from "zod";
import {
  INTERNAL_LIMIT,
  processQueryOutput,
} from "~/components/LinksView/helpers";
import {
  EntityWithName,
  RawLeft,
  RawLinks,
} from "~/components/LinksView/types";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

// set to true to print out query statistics
const DEBUG = false;

function unpackUniqueId(uniqueId: string) {
  const [type, ...id] = uniqueId.split("_");
  if (!type) throw new Error("Invalid uniqueId");
  return {
    type,
    id: id.join("_"),
  };
}

export const linksRouter = createTRPCRouter({
  relatedEntities: protectedProcedure
    .input(
      z.object({
        entityId: z.string(),
        entityType: z.string(),
        eventType: z.string().optional(),
        leftSideType: z.string().optional(),
        limit: z.number().optional(),
        skip: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // 0: get the type of the entity.
      const { leftSideType, entityId, entityType, eventType = "" } = input;

      const query = `
        WITH first_degree_connections AS (
            SELECT
                eav.unique_entity_id_1 as e_start,
                eav.unique_entity_id_2 as e_middle,
                times_seen_together AS first_degree_links
            FROM entity_links_view AS eav
            WHERE event_type = '${eventType}'
            AND eav.entity_type_1 = '${entityType}'
            AND eav.entity_id_1 = '${entityId}'
            ${leftSideType ? `AND eav.entity_type_2 = '${leftSideType}'` : ""}
            LIMIT 10000
        ),
        second_degree_connections AS (
            SELECT
                eav.unique_entity_id_1 as e_middle,
                eav.unique_entity_id_2 as e_end,
                times_seen_together AS second_degree_links
            FROM entity_links_view AS eav
            WHERE e_middle IN (
                SELECT DISTINCT e_middle FROM first_degree_connections
            )
            AND event_type = '${eventType}'
            ${leftSideType ? `AND eav.entity_type_1 = '${leftSideType}'` : ""}
            ${entityType ? `AND eav.entity_type_2 = '${entityType}'` : ""}
        )
        SELECT
            fdc.e_start as entity_id,
            fdc.e_middle as first_degree_id,
            sdc.e_end as second_degree_id,
            fdc.first_degree_links as first_degree_links,
            sdc.second_degree_links as second_degree_links
        FROM first_degree_connections fdc
        JOIN second_degree_connections sdc ON fdc.e_middle = sdc.e_middle
        LIMIT 20000
      `;

      // SETTINGS
      // optimize_aggregation_in_order=1,
      // max_memory_usage=1000000000,
      // max_bytes_before_external_group_by=500000000,
      // max_threads=1;

      const result = await db.query({
        query,
      });

      type Result = {
        entity_id: string;
        first_degree_id: string;
        second_degree_id: string;
        first_degree_links: string;
        second_degree_links: string;
      }[];

      const parsed = await result.json<{
        data: Result;
        statistics: any;
      }>();

      const firstDegreeEntities: EntityWithName[] = uniqBy(
        parsed.data.map((item) => {
          const { type, id } = unpackUniqueId(item.first_degree_id);

          return {
            id: id,
            type: type,
            name: id,
            numLinks: parseInt(item.first_degree_links),
          };
        }),
        (item) => `${item.type}-${item.id}`
      );

      type Link = {
        from: EntityWithName;
        to: EntityWithName;
      };
      const secondDegreeLinks: Link[] = parsed.data
        .map((item) => {
          if (item.entity_id === item.second_degree_id) {
            return null;
          }

          const { type: fromType, id: fromId } = unpackUniqueId(
            item.first_degree_id
          );
          const { type: toType, id: toId } = unpackUniqueId(
            item.second_degree_id
          );

          return {
            from: {
              id: fromId,
              type: fromType,
              name: fromId,
              numLinks: parseInt(item.first_degree_links),
            },
            to: {
              id: toId,
              type: toType,
              name: toId,
              numLinks: parseInt(item.second_degree_links),
            },
          };
        })
        .filter(Boolean) as Link[];

      const output = processQueryOutput({
        rawLeft: firstDegreeEntities,
        rawLinks: secondDegreeLinks,
        shouldGroup: !input.leftSideType,
      });

      const leftEntityIds = output.left
        .filter((item) => item.itemType === "entity")
        .map((item) => `${item.type}_${item.id}`);
      const rightEntityIds = output.right
        .flatMap((item) => {
          if (item.itemType === "entity") {
            return [item];
          }
          if (item.itemType === "group") {
            return item.entities;
          }
          return [];
        })
        .filter((item) => item.itemType === "entity")
        .map((item) => `${item.type}_${item.id}`);

      const entityIds = uniq([...leftEntityIds, ...rightEntityIds]);

      const { namesMap, statistics } = await getNamesMap(entityIds);

      output.left = output.left.map((item) => {
        if (item.itemType === "entity") {
          const id = `${item.type}_${item.id}`;
          return {
            ...item,
            name: namesMap.get(id) ?? item.id,
          };
        }
        return item;
      });
      output.right = output.right.map((item) => {
        if (item.itemType === "entity") {
          const id = `${item.type}_${item.id}`;
          return {
            ...item,
            name: namesMap.get(id) ?? item.id,
          };
        } else if (item.itemType === "group") {
          return {
            ...item,
            entities: item.entities.map((entity) => {
              const id = `${entity.type}_${entity.id}`;
              return {
                ...entity,
                name: namesMap.get(id) ?? entity.id,
              };
            }),
          };
        }
        return item;
      });

      // console.log(parsed.data.slice(0, 5));

      console.log();
      console.log("````````````````````");
      console.log("getLinks - get links");
      console.log(parsed.statistics);
      console.log();
      console.log(`uniqueIds: ${entityIds.length}`);
      console.log();
      console.log("getLinks - get names");
      console.log(statistics);
      console.log("....................");
      console.log();

      return output;
    }),
});

async function getNamesMap(uniqueIds: string[]) {
  if (uniqueIds.length === 0) {
    return {
      namesMap: new Map<string, string>(),
      statistics: {},
    };
  }
  const uniqueNames = await db.query({
    query: `
      SELECT
          unique_entity_id,
          value_String as entity_name
      FROM latest_entity_features_view
      WHERE
          data_type = 'Name'
      AND unique_entity_id IN (${uniqueIds.map((id) => `'${id}'`).join(",")});
    `,
  });

  const names = await uniqueNames.json<{
    data: {
      unique_entity_id: string;
      entity_name: string;
    }[];
    statistics: any;
  }>();

  return {
    namesMap: new Map(
      names.data.map((item) => [item.unique_entity_id, item.entity_name])
    ),
    statistics: names.statistics,
  };
}

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
        leftSideType: z.string().optional(),
        limit: z.number().optional(),
        skip: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // 0: get the type of the entity.

      const { leftSideType, entityId, entityType } = input;

      const query = `
        WITH names AS (
            SELECT
                unique_entity_id,
                value_String as entity_name
            FROM latest_entity_features_view
            WHERE
                data_type = 'Name'
        ),
        first_degree_connections AS (
            SELECT
                eav.unique_entity_id_1,
                eav.unique_entity_id_2,
                times_seen_together AS first_degree_links
            FROM entity_links_view AS eav
            WHERE eav.entity_type_1 = '${entityType}'
            AND eav.entity_id_1 = '${entityId}'
            ${leftSideType ? `AND eav.entity_type_2 = '${leftSideType}'` : ""}
        ),
        second_degree_connections AS (
            SELECT
                eav.unique_entity_id_1,
                eav.unique_entity_id_2,
                times_seen_together AS second_degree_links
            FROM entity_links_view AS eav
            WHERE 1
            ${leftSideType ? `AND eav.entity_type_1 = '${leftSideType}'` : ""}
            ${entityType ? `AND eav.entity_type_2 = '${entityType}'` : ""}
        )
        SELECT
            fdc.unique_entity_id_1 as entity_id,
            fdc.unique_entity_id_2 as first_degree_id,
            sdc.unique_entity_id_2 as second_degree_id,
            fdc.first_degree_links as first_degree_links,
            sdc.second_degree_links as second_degree_links
        FROM first_degree_connections fdc
        JOIN second_degree_connections sdc ON fdc.unique_entity_id_2 = sdc.unique_entity_id_1
        SETTINGS
            optimize_aggregation_in_order=1,
            max_memory_usage=1000000000,
            max_bytes_before_external_group_by=500000000,
            max_threads=1;

      `;

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

      const uniqueIds = uniq([
        ...parsed.data.map((item) => item.first_degree_id),
        ...parsed.data.map((item) => item.second_degree_id),
      ]);

      const uniqueNames = await db.query({
        query: `
          SELECT
              unique_entity_id,
              value_String as entity_name
          FROM latest_entity_features_view
          WHERE
              data_type = 'Name'
          AND unique_entity_id IN (${uniqueIds
            .map((id) => `'${id}'`)
            .join(",")})
        `,
      });

      const names = await uniqueNames.json<{
        data: {
          unique_entity_id: string;
          entity_name: string;
        }[];
        statistics: any;
      }>();

      const namesMap = new Map(
        names.data.map((item) => [item.unique_entity_id, item.entity_name])
      );

      // console.log(parsed.data.slice(0, 5));

      console.log();
      console.log("````````````````````");
      console.log("getLinks - get links");
      console.log(parsed.statistics);
      console.log();
      console.log(`uniqueIds: ${uniqueIds.length}`);
      console.log();
      console.log("getLinks - get names");
      console.log(names.statistics);
      console.log("....................");
      console.log();

      const firstDegreeEntities: EntityWithName[] = uniqBy(
        parsed.data.map((item) => {
          const { type, id } = unpackUniqueId(item.first_degree_id);

          return {
            id: id,
            type: type,
            name: namesMap.get(item.first_degree_id) ?? id,
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
              name: namesMap.get(item.first_degree_id) ?? fromId,
              numLinks: parseInt(item.first_degree_links),
            },
            to: {
              id: toId,
              type: toType,
              name: namesMap.get(item.second_degree_id) ?? toId,
              numLinks: parseInt(item.second_degree_links),
            },
          };
        })
        .filter(Boolean) as Link[];

      return processQueryOutput({
        rawLeft: firstDegreeEntities,
        rawLinks: secondDegreeLinks,
        shouldGroup: !input.leftSideType,
      });
    }),
});

import { Entity } from "event-processing";
import { uniqBy } from "lodash";
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

      const query = `
        WITH recent_names AS (
            SELECT
                entity_type as entity_type,
                entity_id as entity_id,
                value_String as entity_name
            FROM
                features
            WHERE
                data_type = 'Name'
                AND is_deleted = 0
            ORDER BY
                event_id DESC
            LIMIT 1 BY (entity_type, entity_id)
        )
        SELECT
            fdc.entity_id_1 as entity_id,
            fdc.entity_type_1 as entity_type,
            rn1a.entity_name as entity_name,

            fdc.entity_id_2 as first_degree_id,
            fdc.entity_type_2 as first_degree_type,
            rn1b.entity_name as first_degree_name,

            fdc2.entity_id_2 as second_degree_id,
            fdc2.entity_type_2 as second_degree_type,
            rn2.entity_name as second_degree_name
        FROM
            entity_appearance_view fdc
        INNER JOIN
            entity_appearance_view fdc2 
                ON fdc.entity_type_2 = fdc2.entity_type_1
                AND fdc.entity_id_2 = fdc2.entity_id_1
        LEFT JOIN
            recent_names rn1a
                ON fdc.entity_type_1 = rn1a.entity_type
                AND fdc.entity_id_1 = rn1a.entity_id
        LEFT JOIN
            recent_names rn1b
                ON fdc.entity_type_2 = rn1b.entity_type
                AND fdc.entity_id_2 = rn1b.entity_id
        LEFT JOIN
            recent_names rn2
                ON fdc2.entity_type_2 = rn2.entity_type
                AND fdc2.entity_id_2 = rn2.entity_id
        WHERE
            fdc.entity_type_1 = '${input.entityType}'
            AND fdc.entity_id_1 = '${input.entityId}'
            AND fdc2.entity_type_2 = fdc.entity_type_1
            ${
              input.leftSideType
                ? `AND fdc2.entity_type_1 = '${input.leftSideType}'`
                : ""
            }
      
      `;

      const result = await db.query({
        query,
      });

      type Result = {
        entity_type: string;
        entity_id: string;
        entity_name: string;

        first_degree_type: string;
        first_degree_id: string;
        first_degree_name: string;

        second_degree_type: string;
        second_degree_id: string;
        second_degree_name: string;
      }[];

      const parsed = await result.json<{
        data: Result;
        statistics: any;
      }>();

      const firstDegreeEntities: EntityWithName[] = uniqBy(
        parsed.data.map((item) => {
          return {
            id: item.first_degree_id,
            type: item.first_degree_type,
            name: item.first_degree_name ?? item.first_degree_id,
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
          return {
            from: {
              id: item.first_degree_id,
              type: item.first_degree_type,
              name: item.first_degree_name ?? item.first_degree_id,
            },
            to: {
              id: item.second_degree_id,
              type: item.second_degree_type,
              name: item.second_degree_name ?? item.second_degree_id,
            },
          };
        })
        .filter(Boolean) as Link[];

      // const typeRes = await db.query({
      //   query: `
      //     SELECT
      //       entity_type
      //     FROM event_entity
      //     WHERE entity_id = '${input.id}'
      //       AND dataset_id = '${input.datasetId}'
      //     LIMIT 1
      //   `,
      // });
      // const typeParsed = await typeRes.json<{
      //   data: {
      //     entity_type: string;
      //   }[];
      //   statistics: any;
      // }>();

      // if (DEBUG) {
      //   console.log("typeParsed     \t", typeParsed.statistics);
      //   console.log("- Result Length\t", typeParsed.data.length);
      // }

      // const type = typeParsed.data[0]?.entity_type ?? "";

      // // 1: query left side

      // const typeFilter = input.leftSideType
      //   ? `AND entity_type_2 = '${input.leftSideType}'`
      //   : "";

      // const leftSideRes = await db.query({
      //   query: `
      //     SELECT
      //       entity_id_2 as id,
      //       entity_type_2 as type,
      //       first_value(entity_name_2) as name
      //     FROM entity_entity
      //     WHERE dataset_id = '${input.datasetId}'
      //       AND entity_id_1 = '${input.id}'
      //       ${typeFilter}
      //     GROUP BY entity_id_2, entity_type_2
      //     LIMIT ${INTERNAL_LIMIT} BY entity_type_2
      //   `,
      // });
      // const leftSideParsed = await leftSideRes.json<{
      //   data: RawLeft;
      //   statistics: any;
      // }>();

      // if (DEBUG) {
      //   console.log("leftSideParsed \t", leftSideParsed.statistics);
      //   console.log("- Result Length\t", leftSideParsed.data.length);
      // }

      // // 2: query right side

      // const andLeftInLeft = leftSideParsed?.data.length
      //   ? `AND entity_id_1 IN (${leftSideParsed.data
      //       .map((item: any) => `'${item.id}'`) // stupid typescript errors
      //       .join(", ")})`
      //   : "AND FALSE";

      // const linksRes = await db.query({
      //   query: `
      //     SELECT
      //       entity_id_1 as from_id,
      //       entity_type_1 as from_type,
      //       entity_id_2 as to_id,
      //       entity_type_2 as to_type,
      //       first_value(entity_name_2) as to_name
      //     FROM entity_entity
      //     WHERE
      //       dataset_id = '${input.datasetId}'
      //       AND entity_id_2 != '${input.id}'
      //       AND entity_type_2 = '${type}'
      //       ${andLeftInLeft}
      //     GROUP BY entity_id_1, entity_type_1, entity_id_2, entity_type_2
      //     LIMIT ${INTERNAL_LIMIT} BY entity_id_1
      //   `,
      // });
      // const linksParsed = await linksRes.json<{
      //   data: RawLinks;
      //   statistics: any;
      // }>();

      // if (DEBUG) {
      //   console.log("linksParsed    \t", linksParsed.statistics);
      //   console.log("- Result length\t", linksParsed.data.length);
      // }

      // 3: final results

      return processQueryOutput({
        rawLeft: firstDegreeEntities,
        rawLinks: secondDegreeLinks,
        shouldGroup: !input.leftSideType,
      });
    }),
});

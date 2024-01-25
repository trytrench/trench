import { Entity } from "event-processing";
import { uniqBy } from "lodash";
import { z } from "zod";
import {
  INTERNAL_LIMIT,
  processQueryOutput,
} from "~/components/LinksView/helpers";
import { RawLeft, RawLinks } from "~/components/LinksView/types";

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
        WITH first_degree_connections AS (
            SELECT DISTINCT
                f1.entity_type[1] as entity_type_1,
                f1.entity_id[1] as entity_id_1,
                f2.entity_type[1] as entity_type_2,
                f2.entity_id[1] as entity_id_2
            FROM
                features f1
            INNER JOIN
                features f2 ON f1.event_id = f2.event_id AND f1.event_type = f2.event_type
            WHERE
                f1.feature_type = 'EntityAppearance' AND
                f2.feature_type = 'EntityAppearance' AND
                NOT (f1.entity_id[1] = f2.entity_id[1] AND f1.entity_type[1] = f2.entity_type[1])
        )
        
        SELECT
            fdc.entity_type_1 as entity_type,
            fdc.entity_id_1 as entity_id,
            fdc.entity_type_2 as first_degree_type,
            fdc.entity_id_2 as first_degree_id,
            fdc2.entity_type_2 as second_degree_type,
            fdc2.entity_id_2 as second_degree_id
        FROM
            first_degree_connections fdc
        INNER JOIN
            first_degree_connections fdc2 ON fdc.entity_id_2 = fdc2.entity_id_1 AND fdc.entity_type_2 = fdc2.entity_type_1
        WHERE
            fdc.entity_type_1 = '${input.entityType}'
            AND fdc.entity_id_1 = '${input.entityId}'
            AND fdc2.entity_type_2 = entity_type
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
        first_degree_type: string;
        first_degree_id: string;
        second_degree_type: string;
        second_degree_id: string;
      }[];

      const parsed = await result.json<{
        data: Result;
        statistics: any;
      }>();

      const firstDegreeEntities: Entity[] = uniqBy(
        parsed.data.map((item) => {
          return {
            id: item.first_degree_id,
            type: item.first_degree_type,
          };
        }),
        (item) => `${item.type}-${item.id}`
      );

      type Link = {
        from: Entity;
        to: Entity;
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
            },
            to: {
              id: item.second_degree_id,
              type: item.second_degree_type,
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

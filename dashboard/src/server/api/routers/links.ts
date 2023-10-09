import { z } from "zod";
import {
  processQueryOutput,
  INTERNAL_LIMIT,
} from "~/components/LinksView/helpers";
import { RawLeft, RawLinks } from "~/components/LinksView/types";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const linksRouter = createTRPCRouter({
  relatedEntities: publicProcedure
    .input(
      z.object({
        id: z.string(),
        leftSideType: z.string().optional(),
        limit: z.number().optional(),
        skip: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const DEBUG = true;

      // 0: get the type of the entity.

      const typeRes = await db.query({
        query: `
          SELECT
            entity_type
          FROM event_entity
          WHERE entity_id = '${input.id}'
          LIMIT 1
        `,
      });
      const typeParsed = await typeRes.json<{
        data: {
          entity_type: string;
        }[];
        statistics: any;
      }>();

      if (DEBUG) {
        console.log("typeParsed     \t", typeParsed.statistics);
        console.log("- Result Length\t", typeParsed.data.length);
      }

      const type = typeParsed.data[0]?.entity_type ?? "";

      // 1: query left side

      const typeFilter = input.leftSideType
        ? `AND entity_type_2 = '${input.leftSideType}'`
        : "";

      const leftSideRes = await db.query({
        query: `
          SELECT
            entity_id_2 as id,
            entity_type_2 as type,
            first_value(entity_name_2) as name
          FROM entity_entity
          WHERE entity_id_1 = '${input.id}'
            ${typeFilter}
          GROUP BY entity_id_2, entity_type_2
          LIMIT ${INTERNAL_LIMIT} BY entity_type_2
        `,
      });
      const leftSideParsed = await leftSideRes.json<{
        data: RawLeft;
        statistics: any;
      }>();

      if (DEBUG) {
        console.log("leftSideParsed \t", leftSideParsed.statistics);
        console.log("- Result Length\t", leftSideParsed.data.length);
      }

      // 2: query right side

      const andLeftInLeft = leftSideParsed?.data.length
        ? `AND entity_id_1 IN (${leftSideParsed.data
            .map((item) => `'${item.id}'`)
            .join(", ")})`
        : "AND FALSE";

      const linksRes = await db.query({
        query: `
          SELECT
            entity_id_1 as from_id,
            entity_type_1 as from_type,
            entity_id_2 as to_id,
            entity_type_2 as to_type,
            first_value(entity_name_2) as to_name
          FROM entity_entity
          WHERE 
            entity_id_2 != '${input.id}'
            AND entity_type_2 = '${type}'
            ${andLeftInLeft}
          GROUP BY entity_id_1, entity_type_1, entity_id_2, entity_type_2
          LIMIT ${INTERNAL_LIMIT} BY entity_id_1
        `,
      });
      const linksParsed = await linksRes.json<{
        data: RawLinks;
        statistics: any;
      }>();

      if (DEBUG) {
        console.log("linksParsed    \t", linksParsed.statistics);
        console.log("- Result length\t", linksParsed.data.length);
      }

      // 3: final results

      return processQueryOutput({
        rawLeft: leftSideParsed.data,
        rawLinks: linksParsed.data,
        shouldGroup: !input.leftSideType,
      });
    }),
});

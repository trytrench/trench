import { z } from "zod";
import { FnType } from "../enum";
import { createFnTypeDefBuilder } from "../builder";
import { TypeName, tSchemaZod } from "../../data-types";
import { dataPathZodSchema } from "../../data-path";
import { blocklistFnDef } from "../types/BlockList";
import { createFnTypeResolverBuilder } from "../resolverBuilder";

export const blocklistFnResolver = createFnTypeResolverBuilder()
  .setFnTypeDef(blocklistFnDef)
  .setCreateResolver(({ fnDef, input }) => {
    return async ({ getDependency }) => {
      const { stringDataPath } = input;
      const { list } = fnDef.config;

      const strData = await getDependency({
        dataPath: stringDataPath,
        expectedSchema: {
          type: TypeName.String,
        },
      });

      const isBlocked = list.includes(strData);

      return {
        data: isBlocked,
      };
    };
  })
  .build();

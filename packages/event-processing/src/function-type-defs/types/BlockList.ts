import { z } from "zod";
import { FnType } from "./_enum";
import { createFnTypeDefBuilder } from "../builder";
import { TypeName, tSchemaZod } from "../../data-types";
import { dataPathZodSchema } from "../../data-path";

export const blocklistFnDef = createFnTypeDefBuilder()
  .setFnType(FnType.Blocklist)
  .setConfigSchema(
    z.object({
      list: z.array(z.string()),
    })
  )
  .setInputSchema(
    z.object({
      stringDataPath: dataPathZodSchema,
    })
  )
  .setReturnSchema<{ type: TypeName.Boolean }>()
  .setGetDataPaths((input) => {
    return [input.stringDataPath];
  })
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

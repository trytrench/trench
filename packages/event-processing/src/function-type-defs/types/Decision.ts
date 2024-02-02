import { z } from "zod";
import { createFnTypeDefBuilder } from "../builder";
import { FnType } from "./_enum";
import { TypeName } from "../../data-types";
import { dataPathZodSchema } from "../../data-path";

export const decisionFnDef = createFnTypeDefBuilder()
  .setFnType(FnType.Decision)
  .setInputSchema(
    z.object({
      conditions: z.array(
        z.object({
          rules: z.array(dataPathZodSchema),
          decisionId: z.string(),
        })
      ),
      elseDecisionId: z.string(),
    })
  )
  .setReturnSchema<{ type: TypeName.String }>()
  .setGetDataPaths((input) => {
    return input.conditions.flatMap((condition) => condition.rules);
  })
  .setCreateResolver(({ fnDef, input }) => {
    return async ({ event, getDependency }) => {
      const { conditions, elseDecisionId } = input;

      for (const condition of conditions) {
        let isTrue = true;
        for (const rule of condition.rules) {
          const value = await getDependency({
            dataPath: rule,
          });

          if (!value) {
            isTrue = false;
            break;
          }
        }

        if (isTrue) return { data: condition.decisionId };
      }

      return { data: elseDecisionId };
    };
  })
  .build();

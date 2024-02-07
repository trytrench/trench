import { z } from "zod";
import { createFnTypeDefBuilder } from "../builder";
import { FnType } from "../enum";
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
  .build();

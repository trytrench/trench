import { createFnTypeResolverBuilder } from "../resolverBuilder";
import { decisionFnDef } from "../types/Decision";

export const decisionFnResolver = createFnTypeResolverBuilder()
  .setFnTypeDef(decisionFnDef)
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

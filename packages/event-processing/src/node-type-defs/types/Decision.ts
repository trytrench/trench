import { z } from "zod";
import { createNodeTypeDefBuilder } from "../builder";
import { NodeType } from "./_enum";
import { TypeName } from "../../data-types";
import { dataPathZodSchema } from "../../data-path";

export const decisionNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.Decision)
  .setConfigSchema(
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
  .setReturnSchema(TypeName.String)
  .setGetDependencies((config) => {
    return new Set(
      config.conditions.flatMap((condition) =>
        condition.rules.map((rule) => rule.nodeId)
      )
    );
  })
  .setCreateResolver(({ nodeDef }) => {
    return async ({ event, getDependency }) => {
      const { conditions, elseDecisionId } = nodeDef.config;

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

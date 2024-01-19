import { z } from "zod";
import { createNodeTypeDefBuilder } from "../builder";
import { NodeType } from "./_enum";
import { TypeName } from "../../data-types";

export const decisionNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.Decision)
  .setConfigSchema(
    z.object({
      conditions: z.array(
        z.object({
          ruleNodeId: z.string(),
          decisionId: z.string(),
        })
      ),
      elseDecisionId: z.string(),
    })
  )
  .setReturnSchema(TypeName.String)
  .setGetDependencies((config) => {
    return new Set(config.conditions.map((condition) => condition.ruleNodeId));
  })
  .setCreateResolver(({ nodeDef }) => {
    return async ({ event, getDependency }) => {
      const { conditions, elseDecisionId } = nodeDef.config;

      for (const condition of conditions) {
        const value = await getDependency({
          dataPath: {
            nodeId: condition.ruleNodeId,
            path: [],
            schema: { type: TypeName.Boolean },
          },
        });

        if (value) {
          return {
            data: condition.decisionId,
          };
        }
      }

      return {
        data: elseDecisionId,
      };
    };
  })
  .build();

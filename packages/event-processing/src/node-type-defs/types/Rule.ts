import { z } from "zod";
import { createNodeTypeDefBuilder } from "../builder";
import { NodeType } from "./_enum";
import { TypeName } from "../../data-types";

export const ruleNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.Rule)
  .setConfigSchema(
    z.object({
      depsMap: z.record(z.string()),
      tsCode: z.string(),
      compiledJs: z.string(),
    })
  )
  .setReturnSchema(TypeName.Boolean)
  .setGetDependencies((config) => {
    return new Set(Object.values(config.depsMap));
  })
  .setCreateResolver(({ nodeDef }) => {
    return async ({ event, getDependency }) => {
      const { depsMap, compiledJs } = nodeDef.config;

      const depValues: Record<string, any> = {};
      for (const [key, depNodeId] of Object.entries(depsMap)) {
        const featureValue = await getDependency({
          dataPath: {
            nodeId: depNodeId,
            path: [],
            schema: { type: TypeName.Any },
          },
        });
        depValues[key] = featureValue;
      }

      const value = await eval(`(${compiledJs})`)({
        deps: depValues,
        event,
      });

      return {
        data: value,
      };
    };
  })
  .build();

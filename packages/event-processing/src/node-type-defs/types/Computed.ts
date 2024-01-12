import { z } from "zod";
import { NodeType } from "./_enum";
import { createNodeTypeDefBuilder } from "../builder";
import { TypeName } from "../../data-types";

export const computedNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.Computed)
  .setConfigSchema(
    z.object({
      depsMap: z.record(z.string()),
      tsCode: z.string(),
      compiledJs: z.string(),
    })
  )
  .setGetDependencies((config) => {
    return new Set(Object.values(config.depsMap));
  })
  .setCreateResolver(({ nodeDef }) => {
    return async ({ event, getDependency }) => {
      const { depsMap, compiledJs } = nodeDef.config;

      const depValues: Record<string, any> = {};
      for (const [key, depFeatureId] of Object.entries(depsMap)) {
        const featureValue = await getDependency({
          nodeId: depFeatureId,
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

import { z } from "zod";
import { NodeType } from "./_enum";
import { createNodeTypeDefBuilder } from "../builder";
import { TypeName } from "../../data-types";
import { dataPathZodSchema } from "../../data-path";

export const computedNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.Computed)
  .setConfigSchema(
    z.object({
      depsMap: z.record(z.string(), dataPathZodSchema),
      tsCode: z.string().min(1),
      compiledJs: z.string().min(1),
    })
  )
  .setGetDependencies((config) => {
    return new Set(Object.values(config.depsMap).map((path) => path.nodeId));
  })
  .setCreateResolver(({ nodeDef }) => {
    return async ({ event, getDependency }) => {
      const { depsMap, compiledJs } = nodeDef.config;

      const depValues: Record<string, any> = {};
      for (const [key, depPath] of Object.entries(depsMap)) {
        const featureValue = await getDependency({
          dataPath: depPath,
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

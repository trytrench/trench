import { z } from "zod";
import { DataType } from "../../dataTypes";
import { ComputedNodeType, NodeType } from "./_enum";
import { createNodeTypeDefBuilder } from "../builder";

export const computedNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.Computed)
  .setConfigSchema(
    z.object({
      depsMap: z.record(z.string()),
      tsCode: z.string(),
      compiledJs: z.string(),
      paths: z.record(z.string()).optional(),
      type: z.nativeEnum(ComputedNodeType),
      featureId: z.string().optional(),
    })
  )
  .setAllowedDataTypes([
    DataType.Int64,
    DataType.Float64,
    DataType.Boolean,
    DataType.Entity,
    DataType.String,
  ])
  .setCreateResolver(({ nodeDef }) => {
    return async ({ event, getDependency }) => {
      const { depsMap, compiledJs } = nodeDef.config;

      const depValues: Record<string, any> = {};
      for (const [key, depFeatureId] of Object.entries(depsMap)) {
        const featureValue = await getDependency({
          nodeId: depFeatureId,
        });
        depValues[key] = featureValue.value;
      }

      const value = await eval(`(${compiledJs})`)({
        deps: depValues,
        event,
      });

      return {
        data: {
          type: nodeDef.dataType,
          value: value,
        },
        stateUpdaters: [],
      };
    };
  })
  .build();

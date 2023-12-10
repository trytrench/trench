import { z } from "zod";
import { DataType, Entity } from "../../dataTypes";
import { assert } from "../../utils";
import { createFeatureTypeDef } from "../featureTypeDef";
import { FeatureType } from "./_enum";
import { printFDef } from "../lib/print";

export const computedFeatureDef = createFeatureTypeDef({
  featureType: FeatureType.Computed,
  configSchema: z.object({
    depsMap: z.record(z.string()),
    tsCode: z.string(),
    compiledJs: z.string(),
    assignedEntityFeatureIds: z.array(z.string()),
  }),
  allowedDataTypes: [
    DataType.Int64,
    DataType.Float64,
    DataType.Boolean,
    DataType.Entity,
    DataType.String,
  ],
  createResolver: ({ featureDef }) => {
    return async ({ event, getDependency }) => {
      const { depsMap, compiledJs, assignedEntityFeatureIds } =
        featureDef.config;

      const depValues: Record<string, any> = {};
      for (const [key, depFeatureId] of Object.entries(depsMap)) {
        const featureValue = getDependency({
          featureId: depFeatureId,
        });
        depValues[key] = featureValue.value;
      }

      const assignedEntities: Entity[] = [];
      for (const entityFeatureId of assignedEntityFeatureIds) {
        const entityValue = getDependency({
          featureId: entityFeatureId,
          expectedDataTypes: [DataType.Entity],
        });
        assignedEntities.push(entityValue.value);
      }

      const value = await eval(`(${compiledJs})`)({
        deps: depValues,
        event,
      });

      return {
        data: {
          type: featureDef.dataType,
          value: value,
        },
        assignedEntities,
        stateUpdaters: [],
      };
    };
  },
});

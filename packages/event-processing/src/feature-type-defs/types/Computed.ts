import { z } from "zod";
import { DataType } from "~/dataTypes";
import { assert } from "~/utils";
import { createFeatureTypeDef } from "../featureTypeDef";
import { FeatureType } from "./_enum";

export const computedFeatureDef = createFeatureTypeDef({
  featureType: FeatureType.Computed,
  configSchema: z.object({
    depsMap: z.record(z.string()),
    tsCode: z.string(),
    compiledJs: z.string(),
  }),
  allowedDataTypes: [
    DataType.Int64,
    DataType.Float64,
    DataType.Boolean,
    DataType.Entity,
    DataType.String,
  ],
  createResolver: ({ featureDef }) => {
    return async ({ event, dependencies }) => {
      const { depsMap, compiledJs } = featureDef.config;

      const depValues: Record<string, any> = {};
      for (const [key, depFeatureId] of Object.entries(depsMap)) {
        const featureValue = dependencies[depFeatureId];
        assert(featureValue, `Feature ${depFeatureId} not registered`);

        depValues[key] = featureValue.value;
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
        stateUpdaters: [],
        assignedEntities: [],
      };
    };
  },
});

import { z } from "zod";
import { DataType, Entity } from "../../dataTypes";
import { assert } from "../../utils";
import { createFeatureTypeDef } from "../featureTypeDef";
import { FeatureType } from "./_enum";

export const entityAppearanceFeatureDef = createFeatureTypeDef({
  featureType: FeatureType.EntityAppearance,
  configSchema: z.object({
    depsMap: z.record(z.string()),
    tsCode: z.string(),
    compiledJs: z.string(),
    entityType: z.string(),
  }),
  allowedDataTypes: [DataType.Entity],
  createResolver: ({ featureDef }) => {
    return async ({ event, getDependency }) => {
      const { depsMap, compiledJs, entityType } = featureDef.config;

      const depValues: Record<string, any> = {};
      for (const [key, depFeatureId] of Object.entries(depsMap)) {
        const featureValue = getDependency({
          featureId: depFeatureId,
        });

        depValues[key] = featureValue.value;
      }

      const value = await eval(`(${compiledJs})`)({
        deps: depValues,
        event,
      });

      const entity: Entity = {
        type: entityType,
        id: value,
      };

      return {
        data: {
          type: DataType.Entity,
          value: entity,
        },
        stateUpdaters: [],
        assignedEntities: [entity],
      };
    };
  },
});

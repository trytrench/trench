import { assert } from "../../utils";
import { FeatureGetter } from "../types";
import { CreateInstanceOptions, FeatureFactory } from "./interface";

export type Config = {
  depsMap: Record<string, string>;
  tsCode: string;
  compiledJs: string;
};

export class ComputedFeature implements FeatureFactory<Config> {
  createFeatureInstance(options: CreateInstanceOptions<Config>) {
    const getter: FeatureGetter = async ({ event, featureDeps }) => {
      const { depsMap, compiledJs } = options.config;

      const depValues: Record<string, any> = {};
      for (const [key, depFeatureId] of Object.entries(depsMap)) {
        const featureValue = featureDeps[depFeatureId];
        assert(featureValue, `Feature ${depFeatureId} not registered`);
        depValues[key] = featureValue.data;
      }

      const value = await eval(`(${compiledJs})`)({
        deps: depValues,
        event,
      });

      return {
        value,
        stateUpdaters: [],
        assignedEntities: [],
      };
    };

    return {
      featureId: options.featureId,
      dependsOn: options.dependsOn,
      dataType: options.dataType,
      getter,
    };
  }
}

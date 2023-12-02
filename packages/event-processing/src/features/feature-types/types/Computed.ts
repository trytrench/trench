import { assert } from "../../../utils";
import { DataType } from "../../dataTypes";
import { FeatureGetter } from "../../types";
import { CreateInstanceOptions, FeatureFactory } from "../FeatureFactory";

export type Config = {
  depsMap: Record<string, string>;
  tsCode: string;
  compiledJs: string;
};

export class ComputedFeature extends FeatureFactory<Config> {
  allowedDataTypes = [
    DataType.Boolean,
    DataType.Float64,
    DataType.Int64,
    DataType.String,
    DataType.Object,
  ] as const;

  createFeatureGetter(options: CreateInstanceOptions<Config>) {
    const getter: FeatureGetter = async ({ event, featureDeps }) => {
      const { depsMap, compiledJs } = options.config;

      const depValues: Record<string, any> = {};
      for (const [key, depFeatureId] of Object.entries(depsMap)) {
        const featureValue = featureDeps[depFeatureId];
        console.log(depsMap);
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

    return getter;
  }
}

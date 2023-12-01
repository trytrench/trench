import { DataType } from "../dataTypes";
import { FeatureInstance } from "../types";

export type CreateInstanceOptions<TConfig> = {
  featureId: string;
  config: TConfig;
  dataType: DataType;
  dependsOn: Set<string>;
};

export abstract class FeatureFactory<TConfig> {
  readonly allowedDataTypes: readonly DataType[] = [];

  public createFeatureInstance(featureDef: CreateInstanceOptions<TConfig>) {
    if (!this.allowedDataTypes.includes(featureDef.dataType)) {
      throw new Error(
        `Feature ${featureDef.featureId} has invalid data type ${featureDef.dataType}`
      );
    }

    return {
      featureId: featureDef.featureId,
      dependsOn: featureDef.dependsOn,
      dataType: featureDef.dataType,
      getter: this.createFeatureGetter(featureDef),
    };
  }

  abstract createFeatureGetter(
    options: CreateInstanceOptions<TConfig>
  ): FeatureInstance["getter"];
}

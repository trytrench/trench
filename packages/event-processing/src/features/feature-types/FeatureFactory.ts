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

  public createFeatureInstance(options: CreateInstanceOptions<TConfig>) {
    if (!this.allowedDataTypes.includes(options.dataType)) {
      throw new Error(
        `Feature ${options.featureId} has invalid data type ${options.dataType}`
      );
    }

    return {
      featureId: options.featureId,
      dependsOn: options.dependsOn,
      dataType: options.dataType,
      getter: this.createFeatureGetter(options),
    };
  }

  abstract createFeatureGetter(
    options: CreateInstanceOptions<TConfig>
  ): FeatureInstance["getter"];
}

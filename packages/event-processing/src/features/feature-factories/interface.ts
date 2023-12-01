import { DataType } from "../dataTypes";
import { FeatureInstance } from "../types";

export enum FeatureType {
  Entity = "Entity",
  Computed = "Computed",
  Count = "Count",
  UniqueCount = "UniqueCount",
  Rule = "Rule",
}

export type CreateInstanceOptions<TConfig> = {
  featureId: string;
  config: TConfig;
  dataType: DataType;
  dependsOn: Set<string>;
};

export interface FeatureFactory<TConfig> {
  createFeatureInstance: (
    options: CreateInstanceOptions<TConfig>
  ) => FeatureInstance;
}

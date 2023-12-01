import { Config as CountConfig } from "./feature-factories/Count";
import { Config as UniqueCountConfig } from "./feature-factories/UniqueCount";
import { Config as ComputedConfig } from "./feature-factories/Computed";

export enum FeatureType {
  Count = "Count",
  UniqueCount = "UniqueCount",
  Computed = "Computed",
}

export type FeatureConfig = {
  [FeatureType.Count]: CountConfig;
  [FeatureType.UniqueCount]: UniqueCountConfig;
  [FeatureType.Computed]: ComputedConfig;
};

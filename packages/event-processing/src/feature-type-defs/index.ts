import { DataType } from "../dataTypes";
import { FeatureDef, FeatureTypeDef } from "./featureTypeDef";
import { computedFeatureDef } from "./types/Computed";
import { countFeatureDef } from "./types/Count";
import { uniqueCountFeatureDef } from "./types/UniqueCount";
import { FeatureType } from "./types/_enum";

export const FEATURE_TYPE_DEFS = {
  [FeatureType.Computed]: computedFeatureDef,
  [FeatureType.Count]: countFeatureDef,
  [FeatureType.UniqueCount]: uniqueCountFeatureDef,
} satisfies {
  [TFeatureType in FeatureType]: FeatureTypeDef<TFeatureType, any, any, any>;
};

export type FeatureTypeDefs = typeof FEATURE_TYPE_DEFS;

export type FeatureDefs = {
  [TFeatureType in FeatureType]: FeatureDef<
    TFeatureType,
    FeatureTypeDefs[TFeatureType]["allowedDataTypes"][number],
    FeatureTypeDefs[TFeatureType]["configSchema"]["_input"]
  >;
};

export * from "./featureTypeDef";
export * from "./types/_enum";

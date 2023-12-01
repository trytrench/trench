import { CountFeature } from "./feature-types/types/Count";
import { UniqueCountFeature } from "./feature-types/types/UniqueCount";
import { ComputedFeature } from "./feature-types/types/Computed";
import { DataTypeToTsType } from "./dataTypes";

export enum FeatureType {
  Count = "Count",
  UniqueCount = "UniqueCount",
  Computed = "Computed",
}

export type FTFactory = {
  [FeatureType.Count]: CountFeature;
  [FeatureType.UniqueCount]: UniqueCountFeature;
  [FeatureType.Computed]: ComputedFeature;
};

export type FTConfig = {
  [TFeatureType in FeatureType]: Parameters<
    FTFactory[TFeatureType]["createFeatureInstance"]
  >[0]["config"];
};

export type FTAllowedDataTypes = {
  [TFeatureType in FeatureType]: FTFactory[TFeatureType]["allowedDataTypes"][number];
};

export type FTTsType = {
  [TFeatureType in FeatureType]: DataTypeToTsType[FTAllowedDataTypes[TFeatureType]];
};

// Generic type for feature definition, that looks like the above commented out type
export type FTFeatureDef = {
  id: string;
  name: string;
  deps: Array<string>;
} & {
  [TFeatureType in FeatureType]: {
    type: TFeatureType;
    dataType: FTAllowedDataTypes[TFeatureType];
    config: FTConfig[TFeatureType];
  };
};

export type FeatureDef = FTFeatureDef[FeatureType];

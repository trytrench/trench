import { JSONObject } from "superjson/dist/types";

export enum FeatureType {
  Entity = "Entity",
  Computed = "Computed",
  Count = "Count",
  UniqueCount = "UniqueCount",
  Rule = "Rule",
}

export enum DataType {
  String = "string",
  Number = "number",
  Boolean = "boolean",
  Object = "object",
}

export interface FeatureTypeToDataTsType {
  [FeatureType.Entity]: string;
  [FeatureType.Computed]: string | number | boolean | object;
  [FeatureType.Count]: number;
  [FeatureType.UniqueCount]: number;
  [FeatureType.Rule]: boolean;
}

export type DataTsType = FeatureTypeToDataTsType[FeatureType];

export type FeatureDef = {
  id: string;
  name: string;
  deps: Array<string>;
} & (
  | {
      type: FeatureType.Computed;
      dataType:
        | DataType.Boolean
        | DataType.Number
        | DataType.String
        | DataType.Object;
      config: {
        depsMap: Record<string, string>;
        tsCode: string;
        compiledJs: string;
      };
    }
  | {
      type: FeatureType.Entity;
      dataType: DataType.String;
      config: {
        depsMap: Record<string, string>;
        tsCode: string;
        compiledJs: string;
      };
    }
  | {
      type: FeatureType.Count;
      dataType: DataType.Number;
      config: {
        timeWindowMs: number;
        countByEntityFeatureIds: Array<string>;
        conditionFeatureId: string | undefined;
      };
    }
  | {
      type: FeatureType.UniqueCount;
      dataType: DataType.Number;
      config: {
        timeWindowMs: number;
        countUniqueEntityFeatureIds: Array<string>;
        countByEntityFeatureIds: Array<string>;
        conditionFeatureId: string | undefined;
      };
    }
);

export type Event = {
  id: string;
  type: string;
  timestamp: Date;
  data: any;
};

export type FeatureDeps = Record<string, DataTsType>; // Feature ID -> Feature Value

export type ComputedFeatureGetterInput = {
  event: Event;
  deps: FeatureDeps;
};

export type ManipulatorCallback = () => Promise<void>;

export type FeatureGetter<TFeatureType extends FeatureType> = (
  input: ComputedFeatureGetterInput
) => Promise<{
  value: FeatureTypeToDataTsType[TFeatureType];
  callbacks: Array<ManipulatorCallback>;
}>;

import { ZodRawShape, ZodType, z } from "zod";
import { DataType, DataTypeToTsType, Entity, TypedData } from "~/dataTypes";
import { FeatureType } from "./types/_enum";

export type FeatureDef<
  TFeatureType extends FeatureType = any,
  TDataType extends DataType = any,
  TConfig = any,
> = {
  featureId: string;
  featureType: TFeatureType;
  dataType: TDataType;
  config: TConfig;
  dependsOn: Set<string>;
};

export type TrenchEvent = {
  id: string;
  type: string;
  timestamp: Date;
  data: object;
};

export type StateUpdater = () => Promise<void>;

export type Resolver<TDataType extends DataType> = (input: {
  event: TrenchEvent;
  dependencies: Record<string, TypedData[DataType]>;
}) => Promise<{
  stateUpdaters: StateUpdater[];
  assignedEntities: Entity[];
  data: TypedData[TDataType];
}>;

export type FeatureTypeDef<
  TFeatureType extends FeatureType = any,
  TDataType extends DataType = any,
  TConfigSchema extends ZodType = any,
  TContext = any,
> = {
  featureType: TFeatureType;
  configSchema: TConfigSchema;
  allowedDataTypes: TDataType[];
  context?: TContext;
  createResolver: (options: {
    featureDef: FeatureDef<TFeatureType, TDataType, z.infer<TConfigSchema>>;
    context: TContext;
  }) => Resolver<TDataType>;
};

export function createFeatureTypeDef<
  TFeatureType extends FeatureType = any,
  TDataType extends DataType = any,
  TConfigSchema extends ZodType = any,
  TContext = any,
>(def: FeatureTypeDef<TFeatureType, TDataType, TConfigSchema, TContext>) {
  return def;
}

import { ZodType, z } from "zod";
import { DataType, TypedData, TypedDataMap } from "../dataTypes";
import { NodeType } from "./types/_enum";

export type NodeDef<
  TNodeType extends NodeType = NodeType,
  TDataType extends DataType = DataType,
  TConfig = any,
> = {
  id: string;
  name: string;
  type: TNodeType;
  dataType: TDataType;
  config: TConfig;
  dependsOn: Set<string>;
  eventTypes: Set<string>;
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
  getDependency<TDataType extends DataType>(props: {
    nodeId: string;
    expectedDataTypes?: TDataType[];
  }): Promise<TypedDataMap[TDataType]>;
}) => Promise<{
  stateUpdaters: readonly StateUpdater[];
  data: TypedDataMap[TDataType];
}>;

export type NodeTypeDef<
  TNodeType extends NodeType = any,
  TDataType extends DataType = any,
  TConfigSchema extends ZodType = any,
  TContext = unknown,
> = {
  nodeType: TNodeType;
  configSchema: TConfigSchema;
  allowedDataTypes: TDataType[];
  createResolver: (options: {
    nodeDef: NodeDef<TNodeType, TDataType, z.infer<TConfigSchema>>;
    context: TContext;
  }) => Resolver<TDataType>;
};

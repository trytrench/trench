import { ZodType, z } from "zod";
import { NodeType } from "./types/_enum";
import { InferSchemaType, TSchema } from "../data-types";

export type NodeDef<
  TNodeType extends NodeType = NodeType,
  TReturnSchema extends TSchema = TSchema,
  TConfig = any,
> = {
  id: string;
  name: string;
  type: TNodeType;
  returnSchema: TReturnSchema;
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

export type Resolver<TReturn extends TSchema = TSchema> = (input: {
  event: TrenchEvent;
  engineId: string;
  getDependency<TR extends TSchema>(props: {
    nodeId: string;
    expectedSchema?: TR;
  }): Promise<InferSchemaType<TR>>;
}) => Promise<{
  stateUpdaters: readonly StateUpdater[];
  data: InferSchemaType<TReturn>;
}>;

export type NodeTypeDef<
  TNodeType extends NodeType = any,
  TReturn extends TSchema = any,
  TConfigSchema extends ZodType = any,
  TContext = unknown,
> = {
  nodeType: TNodeType;
  configSchema: TConfigSchema;
  returnSchema: TReturn;
  createResolver: (options: {
    nodeDef: NodeDef<TNodeType, TReturn, z.infer<TConfigSchema>>;
    context: TContext;
  }) => Resolver<TReturn>;
  getDependencies: (config: TConfigSchema) => Set<string>;
};

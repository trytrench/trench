import { ZodType, z } from "zod";
import { NodeType } from "./types/_enum";
import { InferSchemaType, TSchema, TypeName, tSchemaZod } from "../data-types";
import { StoreRow } from "./lib/store";
import { DataPath } from "../data-path";

export type NodeDef<
  TNodeType extends NodeType = NodeType,
  TReturnSchema extends TSchema = TSchema,
  TConfig = any,
> = {
  id: string;
  eventType: string;
  name: string;
  type: TNodeType;
  returnSchema: TReturnSchema;
  config: TConfig;
  dependsOn: Set<string>;
};

export function getNodeDefSchema<T extends ZodType<any>>(configSchema: T) {
  return z.object({
    id: z.string(),
    eventType: z.string(),
    name: z.string(),
    type: z.nativeEnum(NodeType),
    returnSchema: tSchemaZod,
    config: configSchema,
    dependsOn: z.set(z.string()),
  });
}

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
    dataPath: DataPath;
    expectedSchema?: TR;
  }): Promise<InferSchemaType<TR>>;
}) => Promise<{
  stateUpdaters?: readonly StateUpdater[];
  savedStoreRows?: StoreRow[];
  data: InferSchemaType<TReturn>;
}>;

export type NodeTypeDef<
  TNodeType extends NodeType = any,
  TReturn extends TSchema = any,
  TConfigSchema extends ZodType = any,
  TContext = any,
> = {
  nodeType: TNodeType;
  configSchema: TConfigSchema;
  createResolver: (options: {
    nodeDef: NodeDef<TNodeType, TReturn, z.infer<TConfigSchema>>;
    context: TContext;
  }) => Resolver<TReturn>;
  getDependencies: (config: TConfigSchema) => Set<string>;
};

import { NodeDef, NodeTypeDef } from "./nodeTypeDef";
import { cacheEntityFeatureNodeDef } from "./types/CacheEntityFeature";
import { computedNodeDef } from "./types/Computed";
import { counterNodeDef } from "./types/Counter";
import { entityAppearanceNodeDef } from "./types/EntityAppearance";
import { getEntityFeatureNodeDef } from "./types/GetEntityFeature";
import { logEntityFeatureNodeDef } from "./types/LogEntityFeature";
import { uniqueCounterNodeDef } from "./types/UniqueCounter";
import { NodeType } from "./types/_enum";

export const NODE_TYPE_DEFS = {
  [NodeType.Computed]: computedNodeDef,
  [NodeType.Counter]: counterNodeDef,
  [NodeType.UniqueCounter]: uniqueCounterNodeDef,
  [NodeType.GetEntityFeature]: getEntityFeatureNodeDef,
  [NodeType.EntityAppearance]: entityAppearanceNodeDef,
  [NodeType.LogEntityFeature]: logEntityFeatureNodeDef,
  [NodeType.CacheEntityFeature]: cacheEntityFeatureNodeDef,
} satisfies {
  [TNodeType in NodeType]: NodeTypeDef<TNodeType, any, any, any>;
};

export type NodeTypeDefsMap = typeof NODE_TYPE_DEFS;

export type NodeDefsMap = {
  [TNodeType in NodeType]: NodeDef<
    TNodeType,
    NodeTypeDefsMap[TNodeType] extends NodeTypeDef<
      any,
      infer TReturnSchema,
      any,
      any
    >
      ? TReturnSchema
      : never,
    NodeTypeDefsMap[TNodeType]["configSchema"]["_input"]
  >;
};

export type ExtractNodeTypeDefContext<T> = T extends NodeTypeDef<
  any,
  any,
  any,
  infer TContext
>
  ? TContext
  : never;

export type NodeTypeContextMap = {
  [TNodeType in NodeType]: ExtractNodeTypeDefContext<
    NodeTypeDefsMap[TNodeType]
  >;
};

export * from "./nodeTypeDef";
export * from "./types/_enum";

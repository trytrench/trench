import { TypeName } from "../data-types";
import { NodeDef, NodeTypeDef } from "./nodeTypeDef";
import { cacheEntityFeatureNodeDef } from "./types/CacheEntityFeature";
import { computedNodeDef } from "./types/Computed";
import { counterNodeDef } from "./types/Counter";
import { entityAppearanceNodeDef } from "./types/EntityAppearance";
import { eventNodeDef } from "./types/Event";
import { getEntityFeatureNodeDef } from "./types/GetEntityFeature";
import { logEntityFeatureNodeDef } from "./types/LogEntityFeature";
import { ruleNodeDef } from "./types/Rule";
import { uniqueCounterNodeDef } from "./types/UniqueCounter";
import { NodeType } from "./types/_enum";

const NODE_TYPE_DEFS = {
  [NodeType.Computed]: computedNodeDef,
  [NodeType.Rule]: ruleNodeDef,
  [NodeType.Counter]: counterNodeDef,
  [NodeType.UniqueCounter]: uniqueCounterNodeDef,
  [NodeType.GetEntityFeature]: getEntityFeatureNodeDef,
  [NodeType.EntityAppearance]: entityAppearanceNodeDef,
  [NodeType.LogEntityFeature]: logEntityFeatureNodeDef,
  [NodeType.CacheEntityFeature]: cacheEntityFeatureNodeDef,
  [NodeType.Event]: eventNodeDef,
} satisfies {
  [TNodeType in NodeType]: NodeTypeDef<TNodeType, any, any, any>;
};

export const NODE_TYPE_REGISTRY: Record<NodeType, NodeTypeDef> = NODE_TYPE_DEFS;

export function getConfigSchema<T extends NodeType>(nodeType: T) {
  return NODE_TYPE_DEFS[nodeType]
    .configSchema as NodeTypeDefsMap[T]["configSchema"];
}

export type NodeTypeDefsMap = typeof NODE_TYPE_DEFS;

export type NodeDefsMap = {
  [TNodeType in keyof NodeTypeDefsMap]: NodeDef<
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

// Build node def

type Args<T extends NodeType> = Omit<NodeDefsMap[T], "id" | "dependsOn">;

export function buildNodeDef<T extends NodeType>(
  type: T,
  args: Args<T>
): Args<T> {
  return args;
}

export * from "./nodeTypeDef";
export * from "./types/_enum";

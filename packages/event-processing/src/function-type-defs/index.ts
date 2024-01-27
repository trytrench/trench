import { AnyZodObject, ZodObject, ZodType } from "zod";
import { TypeName } from "../data-types";
import { FnDef, FnTypeDef } from "./functionTypeDef";
import { cacheEntityFeatureFnDef } from "./types/CacheEntityFeature";
import { computedFnDef } from "./types/Computed";
import { counterFnDef } from "./types/Counter";
import { decisionFnDef } from "./types/Decision";
import { entityAppearanceFnDef } from "./types/EntityAppearance";
import { eventFnDef } from "./types/Event";
import { getEntityFeatureFnDef } from "./types/GetEntityFeature";
import { logEntityFeatureFnDef } from "./types/LogEntityFeature";
import { uniqueCounterFnDef } from "./types/UniqueCounter";
import { FnType } from "./types/_enum";
import { blocklistFnDef } from "./types/BlockList";

const FN_TYPE_DEFS = {
  [FnType.Computed]: computedFnDef,
  [FnType.Counter]: counterFnDef,
  [FnType.UniqueCounter]: uniqueCounterFnDef,
  [FnType.GetEntityFeature]: getEntityFeatureFnDef,
  [FnType.EntityAppearance]: entityAppearanceFnDef,
  [FnType.LogEntityFeature]: logEntityFeatureFnDef,
  [FnType.CacheEntityFeature]: cacheEntityFeatureFnDef,
  [FnType.Event]: eventFnDef,
  [FnType.Decision]: decisionFnDef,
  [FnType.Blocklist]: blocklistFnDef,
} satisfies {
  [TFnType in FnType]: FnTypeDef<TFnType, any, any, any>;
};

export const FN_TYPE_REGISTRY: Record<
  FnType,
  FnTypeDef<FnType, any>
> = FN_TYPE_DEFS as any;

export function getConfigSchema<T extends FnType>(fnType: T) {
  return FN_TYPE_DEFS[fnType].configSchema as FnTypeDefsMap[T]["configSchema"];
}

export function getInputSchema<T extends FnType>(fnType: T) {
  return FN_TYPE_DEFS[fnType].inputSchema as FnTypeDefsMap[T]["inputSchema"];
}

export type FnTypeDefsMap = typeof FN_TYPE_DEFS;

export type ExtractFnTypeDefContext<T> = T extends FnTypeDef<
  any,
  any,
  any,
  any,
  infer TContext
>
  ? TContext
  : never;

export type FnTypeContextMap = {
  [TFnType in FnType]: ExtractFnTypeDefContext<FnTypeDefsMap[TFnType]>;
};

// Build fn def

type Args<T extends FnType> = Omit<FnDef<T>, "id" | "snapshotId">;

export function buildFnDef<T extends FnType>(type: T, args: Args<T>): Args<T> {
  return args;
}

export function hasType<T extends FnType>(
  fnDef: FnDef,
  fnType?: T
): fnDef is FnDef<T extends FnType ? T : FnType> {
  if (!fnType) return true;
  return fnDef.type === fnType;
}

export * from "./functionTypeDef";
export * from "./types/_enum";
export * from "./nodeDef";

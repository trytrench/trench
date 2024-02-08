import { FnType } from "./enum";

import { cacheEntityFeatureFnResolver } from "./resolvers/CacheEntityFeature";
import { computedFnResolver } from "./resolvers/Computed";
import { counterFnResolver } from "./resolvers/Counter";
import { decisionFnResolver } from "./resolvers/Decision";
import { entityAppearanceFnResolver } from "./resolvers/EntityAppearance";
import { eventFnResolver } from "./resolvers/Event";
import { getEntityFeatureFnResolver } from "./resolvers/GetEntityFeature";
import { logEntityFeatureFnResolver } from "./resolvers/LogEntityFeature";
import { uniqueCounterFnResolver } from "./resolvers/UniqueCounter";
import { blocklistFnResolver } from "./resolvers/BlockList";
import { FnTypeResolver } from "./fnTypeResolver";

const FN_TYPE_RESOLVERS = {
  [FnType.Computed]: computedFnResolver,
  [FnType.Counter]: counterFnResolver,
  [FnType.UniqueCounter]: uniqueCounterFnResolver,
  [FnType.GetEntityFeature]: getEntityFeatureFnResolver,
  [FnType.EntityAppearance]: entityAppearanceFnResolver,
  [FnType.LogEntityFeature]: logEntityFeatureFnResolver,
  [FnType.CacheEntityFeature]: cacheEntityFeatureFnResolver,
  [FnType.Event]: eventFnResolver,
  [FnType.Decision]: decisionFnResolver,
  [FnType.Blocklist]: blocklistFnResolver,
} satisfies {
  [TFnType in FnType]: FnTypeResolver<TFnType, any, any, any>;
};

export type FnTypeResolversMap = typeof FN_TYPE_RESOLVERS;

export function getFnTypeResolver<T extends FnType>(fnType: T) {
  return FN_TYPE_RESOLVERS[fnType] as FnType extends T
    ? FnTypeResolver<T, any>
    : FnTypeResolversMap[T];
}

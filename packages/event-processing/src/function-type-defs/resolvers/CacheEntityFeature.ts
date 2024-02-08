import { TypeName } from "../../data-types";
import { hashObject } from "../lib/counts";
import { cacheEntityFeatureFnDef } from "../types/CacheEntityFeature";
import { createFnTypeResolverBuilder } from "../resolverBuilder";

export const cacheEntityFeatureFnResolver = createFnTypeResolverBuilder()
  .setFnTypeDef(cacheEntityFeatureFnDef)
  .setCreateResolver(({ fnDef, context, input }) => {
    return async ({ event, getDependency, engineId }) => {
      const { featureId, featureSchema } = fnDef.config;

      const { entityDataPath, dataPath } = input;

      let assignToEntity = entityDataPath
        ? await getDependency({
            dataPath: entityDataPath,
            expectedSchema: {
              type: TypeName.Entity,
              entityType: undefined,
            },
          })
        : null;

      const value = await getDependency({
        dataPath: dataPath,
      });

      const redisKey = hashObject({
        featureId,
        entity: assignToEntity,
      });

      const redisValue = JSON.stringify(value);

      const stateUpdater = async () => {
        await context.redis.set(redisKey, redisValue);
      };

      return {
        stateUpdaters: [stateUpdater],
        data: value,
      };
    };
  })
  .build();

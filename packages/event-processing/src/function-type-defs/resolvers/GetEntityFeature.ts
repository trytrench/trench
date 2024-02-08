import { TypeName } from "../../data-types";
import { hashObject } from "../lib/counts";
import { createFnTypeResolverBuilder } from "../resolverBuilder";
import { getEntityFeatureFnDef } from "../types/GetEntityFeature";

export const getEntityFeatureFnResolver = createFnTypeResolverBuilder()
  .setFnTypeDef(getEntityFeatureFnDef)
  .setCreateResolver(({ fnDef, input, context }) => {
    return async ({ event, getDependency, engineId }) => {
      const { featureId } = fnDef.config;
      const { entityDataPath } = input;

      let entity = entityDataPath
        ? await getDependency({
            dataPath: entityDataPath,
            expectedSchema: {
              type: TypeName.Entity,
              entityType: undefined,
            },
          })
        : null;

      const redisKey = hashObject({
        featureId,
        entity,
      });

      const buf = await context.redis.get(redisKey);
      const bufStr = buf?.toString() ?? null;
      const val = JSON.parse(bufStr);
      return {
        data: val,
      };
    };
  })
  .build();

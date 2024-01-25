import { z } from "zod";
import { FnType } from "./_enum";
import { createFnTypeDefBuilder } from "../builder";
import {
  Entity,
  TSchema,
  TypeName,
  createDataType,
  tSchemaZod,
} from "../../data-types";
import { getUnixTime } from "date-fns";
import { StoreTable } from "../lib/store";
import { get } from "lodash";
import { hashObject } from "../lib/counts";
import { RedisInterface } from "databases";
import { dataPathZodSchema } from "../../data-path";

export const cacheEntityFeatureFnDef = createFnTypeDefBuilder()
  .setFnType(FnType.CacheEntityFeature)
  .setConfigSchema(
    z.object({
      featureId: z.string(),
      featureSchema: tSchemaZod,
    })
  )
  .setInputSchema(
    z.object({
      entityDataPath: dataPathZodSchema.optional(),
      dataPath: dataPathZodSchema,
    })
  )
  .setContextType<{
    redis: RedisInterface;
  }>()
  .setGetDependencies((input) => {
    const set = new Set<string>();
    if (input.entityDataPath) set.add(input.entityDataPath.nodeId);
    set.add(input.dataPath.nodeId);
    return set;
  })
  .setCreateResolver(({ fnDef, context, input }) => {
    return async ({ event, getDependency, engineId }) => {
      const { featureId, featureSchema } = fnDef.config;

      const { entityDataPath, dataPath } = input;

      let assignToEntity = entityDataPath
        ? await getDependency({
            dataPath: entityDataPath,
            expectedSchema: {
              type: TypeName.Entity,
            },
          })
        : null;

      const value = await getDependency({
        dataPath: dataPath,
        expectedSchema: dataPath.schema,
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
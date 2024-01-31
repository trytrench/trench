import { z } from "zod";
import { FnType } from "./_enum";
import { createFnTypeDefBuilder } from "../builder";
import { Entity, TSchema, TypeName, createDataType } from "../../data-types";
import { hashObject } from "../lib/counts";
import { RedisInterface } from "databases";
import { dataPathZodSchema } from "../../data-path";

export const getEntityFeatureFnDef = createFnTypeDefBuilder()
  .setFnType(FnType.GetEntityFeature)
  .setConfigSchema(
    z.object({
      featureId: z.string(),
      featureSchema: z.record(z.any()),
    })
  )
  .setInputSchema(
    z.object({
      entityDataPath: dataPathZodSchema.optional(),
    })
  )
  .setContextType<{
    redis: RedisInterface;
  }>()
  .setGetDataPaths((config) => {
    const paths = [];
    if (config.entityDataPath) paths.push(config.entityDataPath);
    return paths;
  })
  .setGetDependencies((config) => {
    const set = new Set<string>();
    if (config.entityDataPath) set.add(config.entityDataPath.nodeId);
    return set;
  })
  .setCreateResolver(({ fnDef, input, context }) => {
    return async ({ event, getDependency, engineId }) => {
      const { featureId } = fnDef.config;
      const { entityDataPath } = input;

      let entity = entityDataPath
        ? await getDependency({
            dataPath: entityDataPath,
            expectedSchema: {
              type: TypeName.Entity,
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

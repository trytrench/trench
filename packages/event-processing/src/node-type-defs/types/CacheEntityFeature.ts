import { z } from "zod";
import { NodeType } from "./_enum";
import { createNodeTypeDefBuilder } from "../builder";
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

export const cacheEntityFeatureNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.CacheEntityFeature)
  .setConfigSchema(
    z.object({
      featureId: z.string(),
      featureSchema: tSchemaZod,
      entityDataPath: dataPathZodSchema.optional(),
      dataPath: dataPathZodSchema,
    })
  )
  .setContextType<{
    redis: RedisInterface;
  }>()
  .setGetDependencies((config) => {
    const set = new Set<string>();
    if (config.entityDataPath) set.add(config.entityDataPath.nodeId);
    set.add(config.dataPath.nodeId);
    return set;
  })
  .setCreateResolver(({ nodeDef, context }) => {
    return async ({ event, getDependency, engineId }) => {
      const { featureId, featureSchema, dataPath, entityDataPath } =
        nodeDef.config;

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

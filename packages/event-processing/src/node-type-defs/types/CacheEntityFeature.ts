import { z } from "zod";
import { NodeType } from "./_enum";
import { createNodeTypeDefBuilder } from "../builder";
import { Entity, TSchema, TypeName, createDataType } from "../../data-types";
import { getUnixTime } from "date-fns";
import { StoreTable } from "../lib/store";
import { get } from "lodash";
import { hashObject } from "../lib/counts";
import { RedisInterface } from "databases";

export const cacheEntityFeatureNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.CacheEntityFeature)
  .setConfigSchema(
    z.object({
      featureId: z.string(),
      featureSchema: z.record(z.any()),
      entityAppearanceNodeId: z.string(),
      dataPath: z.object({
        nodeId: z.string(),
        path: z.array(z.string()).optional(),
      }),
    })
  )
  .setContextType<{
    redis: RedisInterface;
  }>()
  .setGetDependencies((config) => {
    const set = new Set<string>();
    set.add(config.entityAppearanceNodeId);
    if (config.dataPath.nodeId) {
      set.add(config.dataPath.nodeId);
    }
    return set;
  })
  .setCreateResolver(({ nodeDef, context }) => {
    return async ({ event, getDependency, engineId }) => {
      const { featureId, featureSchema, dataPath, entityAppearanceNodeId } =
        nodeDef.config;

      const { nodeId, path } = dataPath;

      let assignToEntity = await getDependency({
        nodeId: entityAppearanceNodeId,
        expectedSchema: {
          type: TypeName.Entity,
        },
      });

      const obj =
        nodeId === "event"
          ? await getDependency({
              nodeId: nodeId,
              expectedSchema: {
                type: TypeName.Any,
              },
            })
          : event.data;
      const value = path ? get(obj, path) : obj;

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

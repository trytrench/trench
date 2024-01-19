import { z } from "zod";
import { NodeType } from "./_enum";
import { createNodeTypeDefBuilder } from "../builder";
import { Entity, TSchema, TypeName, createDataType } from "../../data-types";
import { hashObject } from "../lib/counts";
import { RedisInterface } from "databases";
import { dataPathZodSchema } from "../../data-path";

export const getEntityFeatureNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.GetEntityFeature)
  .setConfigSchema(
    z.object({
      featureId: z.string(),
      featureSchema: z.record(z.any()),
      entityDataPath: dataPathZodSchema,
    })
  )
  .setContextType<{
    redis: RedisInterface;
  }>()
  .setGetDependencies((config) => {
    const set = new Set<string>();
    set.add(config.entityDataPath.nodeId);
    return set;
  })
  .setCreateResolver(({ nodeDef, context }) => {
    return async ({ event, getDependency, engineId }) => {
      const { featureId, entityDataPath } = nodeDef.config;

      let entity = await getDependency({
        dataPath: entityDataPath,
        expectedSchema: {
          type: TypeName.Entity,
        },
      });

      const redisKey = hashObject({
        featureId,
        entity,
      });

      const buf = await context.redis.get(redisKey);
      const bufStr = buf.toString();
      const val = JSON.parse(bufStr);
      return {
        data: val,
      };
    };
  })
  .build();

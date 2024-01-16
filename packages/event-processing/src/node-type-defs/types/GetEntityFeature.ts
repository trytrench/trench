import { z } from "zod";
import { NodeType } from "./_enum";
import { createNodeTypeDefBuilder } from "../builder";
import { Entity, TSchema, TypeName, createDataType } from "../../data-types";
import { hashObject } from "../lib/counts";
import { RedisInterface } from "databases";

export const getEntityFeatureNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.GetEntityFeature)
  .setConfigSchema(
    z.object({
      featureId: z.string(),
      featureSchema: z.record(z.any()),
      entityAppearanceNodeId: z.string(),
    })
  )
  .setContextType<{
    redis: RedisInterface;
  }>()
  .setGetDependencies((config) => {
    const set = new Set<string>();
    set.add(config.entityAppearanceNodeId);
    return set;
  })
  .setCreateResolver(({ nodeDef, context }) => {
    return async ({ event, getDependency, engineId }) => {
      const { featureId, entityAppearanceNodeId } = nodeDef.config;

      let entity = await getDependency({
        nodeId: entityAppearanceNodeId,
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

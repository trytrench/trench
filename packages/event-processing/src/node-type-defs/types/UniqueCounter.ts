import { nanoid } from "nanoid";
import { z } from "zod";
import { StateUpdater } from "../nodeTypeDef";
import { getPastNCountBucketHashes, hashObject } from "../lib/counts";
import { NodeType } from "./_enum";
import { createNodeTypeDefBuilder } from "../builder";
import { assert } from "common";
import { type RedisInterface } from "databases";
import { TypeName } from "../../data-types";

const N_BUCKETS = 10;

export const uniqueCounterNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.UniqueCounter)
  .setConfigSchema(
    z.object({
      counterId: z.string(),
      timeWindowMs: z.number(),
      countUniqueNodeIds: z.array(z.string()),
      countByNodeIds: z.array(z.string()),
      conditionNodeId: z.string().optional(),
    })
  )
  .setGetDependencies((config) => {
    const set = new Set<string>();
    for (const nodeId of config.countByNodeIds) {
      set.add(nodeId);
    }
    for (const nodeId of config.countUniqueNodeIds) {
      set.add(nodeId);
    }
    if (config.conditionNodeId) {
      set.add(config.conditionNodeId);
    }
    return set;
  })
  .setReturnSchema({
    type: TypeName.Int64,
  })
  .setContextType<{
    redis: RedisInterface;
  }>()
  .setCreateResolver(({ nodeDef: featureDef, context }) => {
    return async ({ event, getDependency }) => {
      const {
        timeWindowMs,
        counterId,
        countByNodeIds,
        countUniqueNodeIds,
        conditionNodeId,
      } = featureDef.config;

      let shouldUpdateCount = true;
      if (conditionNodeId) {
        shouldUpdateCount = await getDependency({
          nodeId: conditionNodeId,
          expectedSchema: {
            type: TypeName.Boolean,
          },
        });
      }

      const countBy = await Promise.all(
        countByNodeIds.map((nodeId) => {
          return getDependency({
            nodeId: nodeId,
          }).then((data) => JSON.stringify(data));
        })
      );

      const bucketHashes = getPastNCountBucketHashes({
        n: N_BUCKETS,
        currentTime: event.timestamp,
        timeWindowMs: timeWindowMs,
        counterId,
        countBy,
      });

      const countUniqueValues = await Promise.all(
        countUniqueNodeIds.map((featureId) => {
          return getDependency({
            nodeId: featureId,
          }).then((data) => JSON.stringify(data));
        })
      );

      const countUniqueHash = hashObject(countUniqueValues);

      const randomKey = Buffer.from(nanoid());

      // Add current event's entity to unique count via temporary key
      if (shouldUpdateCount) {
        await context.redis.pfadd(randomKey, [countUniqueHash.toString()]);
        bucketHashes.push(randomKey);
      }

      const uniqueCount = await context.redis.pfcount(bucketHashes);

      // Remove temporary key
      if (shouldUpdateCount) {
        await context.redis.del(randomKey);
      }

      const stateUpdaters: StateUpdater[] = [];

      if (shouldUpdateCount) {
        stateUpdaters.push(async () => {
          const latestBucket = bucketHashes[0];
          assert(
            latestBucket,
            "Latest bucket not found (this should never happen)"
          );
          await context.redis.pfadd(latestBucket, [countUniqueHash.toString()]);
        });
      }

      return {
        data: uniqueCount,
        stateUpdaters,
      };
    };
  })
  .build();

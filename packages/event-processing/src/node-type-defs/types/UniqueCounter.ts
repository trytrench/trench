import { nanoid } from "nanoid";
import { z } from "zod";
import { DataType, encodeTypedData } from "../../dataTypes";
import { StateUpdater } from "../nodeTypeDef";
import { getPastNCountBucketHashes, hashObject } from "../lib/counts";
import { NodeType } from "./_enum";
import { createNodeTypeDefBuilder } from "../builder";
import { assert } from "common";
import { type RedisInterface } from "databases";

const N_BUCKETS = 10;

export const uniqueCounterNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.UniqueCounter)
  .setConfigSchema(
    z.object({
      counterId: z.string(),
      timeWindowMs: z.number(),
      countUniqueNodeIds: z.array(z.string()),
      countByNodeIds: z.array(z.string()),
      conditionFeatureId: z.string().optional(),
    })
  )
  .setAllowedDataTypes([DataType.Int64])
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
        conditionFeatureId,
      } = featureDef.config;

      let shouldUpdateCount = true;
      if (conditionFeatureId) {
        const featureData = await getDependency({
          nodeId: conditionFeatureId,
          expectedDataTypes: [DataType.Boolean],
        });

        shouldUpdateCount = featureData.value;
      }

      const countBy = await Promise.all(
        countByNodeIds.map((nodeId) => {
          return getDependency({
            nodeId: nodeId,
          }).then((data) => encodeTypedData(data));
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
          }).then((data) => encodeTypedData(data));
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
        data: {
          type: DataType.Int64,
          value: uniqueCount,
        },
        stateUpdaters,
      };
    };
  })
  .build();

import { z } from "zod";
import { StateUpdater } from "../nodeTypeDef";
import { counterSchema, getPastNCountBucketHashes } from "../lib/counts";
import { NodeType } from "./_enum";
import { createNodeTypeDefBuilder } from "../builder";
import { assert } from "common";
import { RedisInterface } from "databases";
import { TypeName } from "../../data-types";
import { dataPathZodSchema } from "../../data-path";
import { getTimeWindowMs } from "../lib/timeWindow";

const N_BUCKETS = 10;

export const counterNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.Counter)
  .setConfigSchema(
    z.object({
      counter: counterSchema,
      countByDataPaths: z.array(dataPathZodSchema),
      conditionDataPath: dataPathZodSchema.optional(),
    })
  )
  .setReturnSchema(TypeName.Int64)
  .setGetDependencies((config) => {
    const set = new Set<string>();
    for (const path of config.countByDataPaths) {
      set.add(path.nodeId);
    }
    if (config.conditionDataPath?.nodeId) {
      set.add(config.conditionDataPath.nodeId);
    }
    return set;
  })
  .setContextType<{
    redis: RedisInterface;
  }>()
  .setCreateResolver(({ nodeDef, context }) => {
    return async ({ event, getDependency }) => {
      /**
       * 1. In order to get the count, we need to get the counts of the previous 10 time buckets and add them up.
       *      bucket_key = hash(timeBucket, featureId, hash([entities, sorted by entityFeatureId]))
       * 2. Then, we need to return a callback that increments the count of the current time bucket.
       */

      const { counter, countByDataPaths, conditionDataPath } = nodeDef.config;

      let shouldIncrementCount = true;
      if (conditionDataPath) {
        shouldIncrementCount = await getDependency({
          dataPath: conditionDataPath,
          expectedSchema: {
            type: TypeName.Boolean,
          },
        });
      }

      const valuesToCountBy = await Promise.all(
        countByDataPaths.map((nodeId) => {
          return getDependency({
            dataPath: nodeId,
          }).then((value) => JSON.stringify(value));
        })
      );

      const bucketHashes = getPastNCountBucketHashes({
        n: N_BUCKETS,
        timeWindowMs: getTimeWindowMs(counter.timeWindow),
        counterId: counter.id,
        countBy: valuesToCountBy,
        currentTime: event.timestamp,
      });

      const counts = await context.redis.mgetNumbers(bucketHashes);

      const totalCountFromRedis = counts.reduce((a, b) => a + b, 0);
      const totalCount = totalCountFromRedis + (shouldIncrementCount ? 1 : 0);

      // If incrementing the count, add a state updater to increment the count of the latest bucket
      const stateUpdaters: StateUpdater[] = [];
      if (shouldIncrementCount) {
        stateUpdaters.push(async () => {
          const latestBucket = bucketHashes[0];
          assert(
            latestBucket,
            "Latest bucket not found (this should never happen)"
          );
          await context.redis.increment(latestBucket, 1);
        });
      }

      return {
        data: totalCount,
        stateUpdaters,
      };
    };
  })
  .build();

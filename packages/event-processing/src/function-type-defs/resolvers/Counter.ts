import { StateUpdater } from "../functionTypeDef";
import { getPastNCountBucketHashes } from "../lib/counts";
import { assert } from "common";
import { TypeName } from "../../data-types";
import { getTimeWindowMs } from "../lib/timeWindow";
import { createFnTypeResolverBuilder } from "../resolverBuilder";
import { counterFnDef } from "../types/Counter";

const N_BUCKETS = 10;

export const counterFnResolver = createFnTypeResolverBuilder()
  .setFnTypeDef(counterFnDef)
  .setCreateResolver(({ fnDef, input, context }) => {
    return async ({ event, getDependency }) => {
      /**
       * 1. In order to get the count, we need to get the counts of the previous 10 time buckets and add them up.
       *      bucket_key = hash(timeBucket, featureId, hash([entities, sorted by entityFeatureId]))
       * 2. Then, we need to return a callback that increments the count of the current time bucket.
       */

      const { timeWindow } = fnDef.config;
      const { countByDataPaths, conditionDataPath } = input;

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
        timeWindowMs: getTimeWindowMs(timeWindow),
        counterId: fnDef.id,
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

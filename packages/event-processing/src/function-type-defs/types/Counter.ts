import { z } from "zod";
import { StateUpdater } from "../functionTypeDef";
import { getPastNCountBucketHashes } from "../lib/counts";
import { FnType } from "./_enum";
import { createFnTypeDefBuilder } from "../builder";
import { assert } from "common";
import { RedisInterface } from "databases";
import { TypeName } from "../../data-types";
import { DataPath, dataPathZodSchema } from "../../data-path";
import { getTimeWindowMs, timeWindowSchema } from "../lib/timeWindow";
import { countArgsSchema } from "../lib/args";

const N_BUCKETS = 10;

export const counterFnDef = createFnTypeDefBuilder()
  .setFnType(FnType.Counter)
  .setConfigSchema(
    z.object({
      timeWindow: timeWindowSchema,
      countByArgs: countArgsSchema,
    })
  )
  .setInputSchema(
    z.object({
      countByDataPaths: z.array(dataPathZodSchema),
      conditionDataPath: dataPathZodSchema.optional(),
    })
  )
  .setReturnSchema<{ type: TypeName.Int64 }>()
  .setGetDataPaths((config) => {
    const arr: DataPath[] = [];
    arr.push(...config.countByDataPaths);
    if (config.conditionDataPath?.nodeId) {
      arr.push(config.conditionDataPath);
    }
    return arr;
  })
  .setContextType<{
    redis: RedisInterface;
  }>()
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

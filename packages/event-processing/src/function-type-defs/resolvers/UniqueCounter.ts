import { nanoid } from "nanoid";
import { StateUpdater } from "../functionTypeDef";
import { getPastNCountBucketHashes, hashObject } from "../lib/counts";
import { assert } from "common";
import { TypeName } from "../../data-types";
import { getTimeWindowMs } from "../lib/timeWindow";
import { createFnTypeResolverBuilder } from "../resolverBuilder";
import { uniqueCounterFnDef } from "../types/UniqueCounter";

const N_BUCKETS = 10;

export const uniqueCounterFnResolver = createFnTypeResolverBuilder()
  .setFnTypeDef(uniqueCounterFnDef)
  .setCreateResolver(({ fnDef, input, context }) => {
    return async ({ event, getDependency }) => {
      const { timeWindow, countArgs, countByArgs } = fnDef.config;
      const { conditionDataPath, countDataPaths, countByDataPaths } = input;

      let shouldUpdateCount = true;
      if (conditionDataPath) {
        shouldUpdateCount = await getDependency({
          dataPath: conditionDataPath,
          expectedSchema: {
            type: TypeName.Boolean,
          },
        });
      }

      const countBy = await Promise.all(
        countByDataPaths.map((path) => {
          return getDependency({
            dataPath: path,
          }).then((data) => JSON.stringify(data));
        })
      );

      const bucketHashes = getPastNCountBucketHashes({
        n: N_BUCKETS,
        currentTime: event.timestamp,
        timeWindowMs: getTimeWindowMs(timeWindow),
        counterId: fnDef.id,
        countBy,
      });

      const countUniqueValues = await Promise.all(
        countDataPaths.map((path) => {
          return getDependency({
            dataPath: path,
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

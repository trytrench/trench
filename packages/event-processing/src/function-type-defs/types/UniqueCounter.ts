import { nanoid } from "nanoid";
import { z } from "zod";
import { StateUpdater } from "../functionTypeDef";
import { getPastNCountBucketHashes, hashObject } from "../lib/counts";
import { FnType } from "./_enum";
import { createFnTypeDefBuilder } from "../builder";
import { assert } from "common";
import { type RedisInterface } from "databases";
import { TypeName } from "../../data-types";
import { dataPathZodSchema } from "../../data-path";
import { getTimeWindowMs, timeWindowSchema } from "../lib/timeWindow";
import { countArgsSchema } from "../lib/args";

const N_BUCKETS = 10;

export const uniqueCounterFnDef = createFnTypeDefBuilder()
  .setFnType(FnType.UniqueCounter)
  .setConfigSchema(
    z.object({
      timeWindow: timeWindowSchema,
      countByArgs: countArgsSchema,
      countArgs: countArgsSchema,
    })
  )
  .setInputSchema(
    z.object({
      countByDataPaths: z.array(dataPathZodSchema),
      countDataPaths: z.array(dataPathZodSchema),
      conditionDataPath: dataPathZodSchema.optional(),
    })
  )
  .setGetDependencies((config) => {
    const set = new Set<string>();
    for (const path of config.countByDataPaths) {
      set.add(path.nodeId);
    }
    for (const path of config.countDataPaths) {
      set.add(path.nodeId);
    }
    if (config.conditionDataPath) {
      set.add(config.conditionDataPath.nodeId);
    }
    return set;
  })
  .setReturnSchema(TypeName.Int64)
  .setContextType<{
    redis: RedisInterface;
  }>()
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

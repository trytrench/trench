import { nanoid } from "nanoid";
import { z } from "zod";
import { StateUpdater } from "../nodeTypeDef";
import {
  getPastNCountBucketHashes,
  hashObject,
  uniqueCounterSchema,
} from "../lib/counts";
import { NodeType } from "./_enum";
import { createNodeTypeDefBuilder } from "../builder";
import { assert } from "common";
import { type RedisInterface } from "databases";
import { TypeName } from "../../data-types";
import { dataPathZodSchema } from "../../data-path";
import { getTimeWindowMs } from "../lib/timeWindow";

const N_BUCKETS = 10;

export const uniqueCounterNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.UniqueCounter)
  .setConfigSchema(
    z.object({
      uniqueCounter: uniqueCounterSchema,
      countDataPaths: z.array(dataPathZodSchema),
      countByDataPaths: z.array(dataPathZodSchema),
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
  .setCreateResolver(({ nodeDef: featureDef, context }) => {
    return async ({ event, getDependency }) => {
      const {
        uniqueCounter,
        conditionDataPath,
        countDataPaths,
        countByDataPaths,
      } = featureDef.config;

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
        timeWindowMs: getTimeWindowMs(uniqueCounter.timeWindow),
        counterId: uniqueCounter.id,
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

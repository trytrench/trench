import { z } from "zod";
import { DataType, Entity, encodeTypedData } from "../../dataTypes";
import { assert } from "../../utils";
import { StateUpdater, createFeatureTypeDef } from "../featureTypeDef";
import { getPastNCountBucketHashes } from "../lib/counts";
import { MockRedisService } from "../services/redis";
import { getRedisService } from "./../services/redis";
import { FeatureType } from "./_enum";

export const countFeatureDef = createFeatureTypeDef({
  featureType: FeatureType.Count,
  configSchema: z.object({
    timeWindow: z.object({
      number: z.number(),
      unit: z.enum(["minutes", "hours", "days", "weeks", "months"]),
    }),
    countByFeatureIds: z.array(z.string()),
    conditionFeatureId: z.string().optional(),
  }),
  allowedDataTypes: [DataType.Int64],
  getContext: () => {
    return {
      redis: getRedisService(),
    };
  },
  createResolver: ({ featureDef, context }) => {
    return async ({ event, dependencies }) => {
      /**
       * 1. In order to get the count, we need to get the counts of the previous 10 time buckets and add them up.
       *      bucket_key = hash(timeBucket, featureId, hash([entities, sorted by entityFeatureId]))
       * 2. Then, we need to return a callback that increments the count of the current time bucket.
       */

      const { timeWindow, countByFeatureIds, conditionFeatureId } =
        featureDef.config;

      const intervals = {
        minutes: 60000,
        hours: 3600000,
        days: 86400000,
        weeks: 604800000,
        months: 2628000000,
      };

      const timeWindowMs = timeWindow.number * intervals[timeWindow.unit];

      let shouldIncrementCount = true;
      if (conditionFeatureId) {
        const conditionValue = dependencies[conditionFeatureId];
        assert(conditionValue, `Feature ${conditionFeatureId} not registered`);
        assert(conditionValue.type === DataType.Boolean, "Expected boolean");
        shouldIncrementCount = conditionValue.value;
      }

      const featuresToCountBy = countByFeatureIds.map((featureId) => {
        const data = dependencies[featureId];
        assert(data, `Feature ${featureId} not registered`);
        return { featureId, data };
      });

      const countBy = featuresToCountBy.map((feature) => {
        const stringValue = encodeTypedData(feature.data);
        return { stringValue, featureId: feature.featureId };
      });

      const bucketHashes = getPastNCountBucketHashes({
        n: 10,
        timeWindowMs: timeWindowMs,
        countFeatureId: featureDef.featureId,
        countBy,
        eventTimestamp: event.timestamp,
      });

      const counts = await context.redis.mgetNumbers(bucketHashes);

      const totalCountFromRedis = counts.reduce((a, b) => a + b, 0);
      const totalCount = totalCountFromRedis + (shouldIncrementCount ? 1 : 0);

      // If incrementing the count, add a state updater to increment the count of the latest bucket
      const stateUpdaters: StateUpdater[] = [];
      if (shouldIncrementCount) {
        stateUpdaters.push(async () => {
          const latestBucket = bucketHashes[0];
          assert(latestBucket, "Latest bucket not found");
          context.redis.increment(latestBucket, 1);
        });
      }

      // Assign feature to all entities that are being counted by
      const assignedEntities: Entity[] = [];
      for (const { data } of featuresToCountBy) {
        if (data.type === DataType.Entity) {
          assignedEntities.push(data.value);
        }
      }

      return {
        data: {
          type: DataType.Int64,
          value: totalCount,
        },
        stateUpdaters,
        assignedEntities,
      };
    };
  },
});

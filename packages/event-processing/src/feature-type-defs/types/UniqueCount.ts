import { nanoid } from "nanoid";
import { z } from "zod";
import { DataType, Entity, encodeTypedData } from "../../dataTypes";
import { assert } from "../../utils";
import { StateUpdater, createFeatureTypeDef } from "../featureTypeDef";
import { getPastNCountBucketHashes, hashObject } from "../lib/counts";
import { getRedisService } from "../services/redis";
import { FeatureType } from "./_enum";

export const uniqueCountFeatureDef = createFeatureTypeDef({
  featureType: FeatureType.UniqueCount,
  configSchema: z.object({
    timeWindow: z.object({
      number: z.number(),
      unit: z.enum(["minutes", "hours", "days", "weeks", "months"]),
    }),
    countUniqueFeatureIds: z.array(z.string()),
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
    return async ({ event, getDependency }) => {
      const {
        timeWindow,
        countByFeatureIds,
        countUniqueFeatureIds,
        conditionFeatureId,
      } = featureDef.config;

      const intervals = {
        minutes: 60000,
        hours: 3600000,
        days: 86400000,
        weeks: 604800000,
        months: 2628000000,
      };

      const timeWindowMs = timeWindow.number * intervals[timeWindow.unit];

      let shouldUpdateCount = true;
      if (conditionFeatureId) {
        const featureData = getDependency({
          featureId: conditionFeatureId,
          expectedDataTypes: [DataType.Boolean],
        });

        shouldUpdateCount = featureData.value;
      }

      const featuresToCountBy = countByFeatureIds.map((featureId) => {
        const data = getDependency({
          featureId,
          expectedDataTypes: [DataType.Entity, DataType.String],
        });
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

      const countUniqueValues = countUniqueFeatureIds.map((featureId) => {
        const value = getDependency({
          featureId,
          expectedDataTypes: [DataType.Entity, DataType.String],
        });
        return { featureId, value };
      });

      const sortedCountUniqueValues = countUniqueValues.sort((a, b) => {
        return a.featureId < b.featureId ? -1 : 1;
      });

      const sortedValuesHash = hashObject(sortedCountUniqueValues);

      const randomKey = Buffer.from(nanoid());

      // Add current event's entity to unique count via temporary key
      if (shouldUpdateCount) {
        await context.redis.pfadd(randomKey, [sortedValuesHash.toString()]);
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
          await context.redis.pfadd(latestBucket, [
            sortedValuesHash.toString(),
          ]);
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
          value: uniqueCount,
        },
        stateUpdaters,
        assignedEntities,
      };
    };
  },
});

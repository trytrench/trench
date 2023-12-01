import { assert } from "../../../utils";
import { DataType, Entity } from "../../dataTypes";
import { getPastNCountBucketHashes } from "../../lib/counts";
import { stringifyFeatureValue } from "../../lib/stringifyFeature";
import { RedisInterface } from "../../services/redis";
import { FeatureGetter, StateUpdater } from "../../types";
import { CreateInstanceOptions, FeatureFactory } from "../FeatureFactory";

export type Config = {
  timeWindowMs: number;
  countByFeatureIds: Array<string>;
  conditionFeatureId: string | undefined;
};

export class CountFeature extends FeatureFactory<Config> {
  redis: RedisInterface;
  constructor(redis: RedisInterface) {
    super();
    this.redis = redis;
  }

  allowedDataTypes = [DataType.Int64] as const;

  createFeatureGetter(options: CreateInstanceOptions<Config>) {
    const getter: FeatureGetter = async ({ event, featureDeps }) => {
      /**
       * 1. In order to get the count, we need to get the counts of the previous 10 time buckets and add them up.
       *      bucket_key = hash(timeBucket, featureId, hash([entities, sorted by entityFeatureId]))
       * 2. Then, we need to return a callback that increments the count of the current time bucket.
       */

      const { timeWindowMs, countByFeatureIds, conditionFeatureId } =
        options.config;

      let shouldIncrementCount = true;
      if (conditionFeatureId) {
        const conditionValue = featureDeps[conditionFeatureId];
        assert(conditionValue, `Feature ${conditionFeatureId} not registered`);
        assert(conditionValue.type === DataType.Boolean, "Expected boolean");
        shouldIncrementCount = conditionValue.data;
      }

      const countByValues = countByFeatureIds.map((featureId) => {
        const value = featureDeps[featureId];
        assert(value, `Feature ${featureId} not registered`);
        return { featureId, value };
      });
      const countBy = countByValues.map((feature) => {
        const stringValue = stringifyFeatureValue(feature.value);
        return { stringValue, featureId: feature.featureId };
      });

      const bucketHashes = getPastNCountBucketHashes({
        n: 10,
        timeWindowMs: timeWindowMs,
        countFeatureId: options.featureId,
        countBy,
        eventTimestamp: event.timestamp,
      });

      const counts = await this.redis.mgetNumbers(bucketHashes);

      const totalCountFromRedis = counts.reduce((a, b) => a + b, 0);
      const totalCount = totalCountFromRedis + (shouldIncrementCount ? 1 : 0);

      // If incrementing the count, add a state updater to increment the count of the latest bucket
      const stateUpdaters: StateUpdater[] = [];
      if (shouldIncrementCount) {
        stateUpdaters.push(async () => {
          const latestBucket = bucketHashes[0];
          assert(latestBucket, "Latest bucket not found");
          this.redis.increment(latestBucket, 1);
        });
      }

      // Assign feature to all entities that are being counted by
      const assignedEntities: Entity[] = [];
      for (const { value } of countByValues) {
        if (value.type === DataType.Entity) {
          assignedEntities.push(value.data);
        }
      }

      return {
        value: totalCount,
        stateUpdaters,
        assignedEntities,
      };
    };

    return getter;
  }
}

import { nanoid } from "nanoid";
import { assert } from "../../../utils";
import { DataType, Entity } from "../../dataTypes";
import { getPastNCountBucketHashes, hashObject } from "../../lib/counts";
import { stringifyFeatureValue } from "../../lib/stringifyFeature";
import { FeatureGetter, StateUpdater } from "../../types";
import { CreateInstanceOptions, FeatureFactory } from "../FeatureFactory";
import { RedisInterface } from "../../services/redis";

export type Config = {
  timeWindowMs: number;
  countUniqueFeatureIds: Array<string>;
  countByFeatureIds: Array<string>;
  conditionFeatureId: string | undefined;
};

export class UniqueCountFeature extends FeatureFactory<Config> {
  redis: RedisInterface;
  constructor(redis: RedisInterface) {
    super();
    this.redis = redis;
  }

  allowedDataTypes = [DataType.Int64] as const;

  createFeatureGetter(options: CreateInstanceOptions<Config>) {
    const getter: FeatureGetter = async ({ event, featureDeps }) => {
      const {
        timeWindowMs,
        countByFeatureIds,
        countUniqueFeatureIds,
        conditionFeatureId,
      } = options.config;

      let shouldUpdateCount = true;
      if (conditionFeatureId) {
        const conditionValue = featureDeps[conditionFeatureId];
        assert(conditionValue, `Feature ${conditionFeatureId} not registered`);
        assert(conditionValue.type === DataType.Boolean, "Expected boolean");
        shouldUpdateCount = conditionValue.data;
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

      const countUniqueValues = countUniqueFeatureIds.map((featureId) => {
        const value = featureDeps[featureId];
        assert(value, `Feature ${featureId} not registered`);
        return { featureId, value };
      });

      const sortedCountUniqueValues = countUniqueValues.sort((a, b) => {
        return a.featureId < b.featureId ? -1 : 1;
      });

      const sortedValuesHash = hashObject(sortedCountUniqueValues);

      const randomKey = Buffer.from(nanoid());

      // Add current event's entity to unique count via temporary key
      if (shouldUpdateCount) {
        await this.redis.pfadd(randomKey, [sortedValuesHash.toString()]);
        bucketHashes.push(randomKey);
      }

      const uniqueCount = await this.redis.pfcount(bucketHashes);

      // Remove temporary key
      if (shouldUpdateCount) {
        await this.redis.del(randomKey);
      }

      const stateUpdaters: StateUpdater[] = [];
      if (shouldUpdateCount) {
        stateUpdaters.push(async () => {
          const latestBucket = bucketHashes[0];
          assert(latestBucket, "Latest bucket not found");
          await this.redis.pfadd(latestBucket, [sortedValuesHash.toString()]);
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
        value: uniqueCount,
        stateUpdaters,
        assignedEntities,
      };
    };

    return getter;
  }
}

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Context, SqrlKey } from "sqrl";
import {
  getBucketSize,
  getBucketTimeForTimeMs,
  getBucketKey,
  getCurrentBucketExpirySeconds,
  getAllBucketKeys,
} from "./BucketedKeys";
import { TOTAL_COUNT_EXPIRY_SEC } from "./RedisCountService";
import { CountUniqueService } from "../Services";
import { RedisInterface, createRedisKey } from "./RedisInterface";

const NUM_BUCKETS = 10;

export class RedisApproxCountUniqueService implements CountUniqueService {
  constructor(private redis: RedisInterface, private prefix: string) {}

  private async bumpTotal(ctx: Context, key: SqrlKey, sortedHashes: string[]) {
    const redisKey = createRedisKey(
      ctx.requireDatabaseSet(),
      this.prefix,
      key.getHex()
    );
    await Promise.all([
      this.redis.pfadd(ctx, redisKey, sortedHashes),
      this.redis.expire(ctx, redisKey, TOTAL_COUNT_EXPIRY_SEC),
    ]);
  }
  async bump(
    ctx: Context,
    props: {
      at: number;
      key: SqrlKey;
      sortedHashes: string[];
      windowMs: number | null;
    }
  ) {
    const { at, key, sortedHashes, windowMs } = props;
    if (windowMs === null) {
      return this.bumpTotal(ctx, key, sortedHashes);
    }
    const bucketSize = getBucketSize(windowMs, NUM_BUCKETS);
    const currentBucket = getBucketTimeForTimeMs(at, bucketSize);
    const redisKey = getBucketKey(
      ctx.requireDatabaseSet(),
      this.prefix,
      key.getHex(),
      windowMs,
      currentBucket
    );

    await this.redis.pfadd(ctx, redisKey, sortedHashes);
    await this.redis.expire(
      ctx,
      redisKey,
      getCurrentBucketExpirySeconds(windowMs, bucketSize)
    );
  }

  async fetchHashes(
    ctx: Context,
    props: { keys: SqrlKey[]; windowStartMs: number }
  ): Promise<string[]> {
    throw new Error("fetchHashes() is not implemented");
  }

  async fetchTotal(
    ctx: Context,
    key: SqrlKey,
    at: number,
    windowMs: number,
    extraHashesKey: Buffer | null
  ) {
    const redisKey = createRedisKey(
      ctx.requireDatabaseSet(),
      this.prefix,
      key.getHex()
    );
    return this.redis.pfcount(
      ctx,
      extraHashesKey ? [redisKey, extraHashesKey] : [redisKey]
    );
  }

  async fetchCounts(
    ctx: Context,
    props: {
      keys: SqrlKey[];
      at: number;
      windowMs: number;
      addHashes: string[];
    }
  ): Promise<number[]> {
    const { at, keys, windowMs, addHashes } = props;
    const databaseSet = ctx.requireDatabaseSet();

    let extraHashesKey: Buffer = null;
    if (addHashes.length) {
      extraHashesKey = createRedisKey(
        databaseSet,
        this.prefix,
        "temp",
        ...addHashes
      );

      // Just inserting these in redis is fine to ensure they are in the pipeline before the
      // pfcount messages
      // @todo: This would be better using a redis pipeline but would require a refactor.
      Promise.all([
        this.redis.pfadd(ctx, extraHashesKey, addHashes),
        this.redis.expire(ctx, extraHashesKey, 1),
      ]).catch((err) => {
        ctx.warn(
          {},
          "Error on countUnique() temporary hash insertion: " + err.toString()
        );
      });
    }

    return Promise.all(
      keys.map(async (key) => {
        if (windowMs === null) {
          return this.fetchTotal(ctx, key, at, windowMs, extraHashesKey);
        }
        const keys = getAllBucketKeys(
          databaseSet,
          this.prefix,
          key,
          at,
          windowMs,
          NUM_BUCKETS
        );

        if (extraHashesKey) {
          keys.push(extraHashesKey);
        }
        return this.redis.pfcount(ctx, keys);
      })
    );
  }
}

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Context, SqrlKey } from "sqrl";
import {
  getCurrentBucketExpirySeconds,
  getBucketKey,
  getBucketTimeForTimeMs,
  getBucketSize,
  getWindowStart,
  getAllBucketKeys,
} from "./BucketedKeys";
import { CountService } from "../Services";
import { RedisInterface, createRedisKey } from "./RedisInterface";

const NUM_BUCKETS = 10;
/**
 * By default expire total counts if they haven't been seen in 90 days
 * @todo: This should be a configuration option
 */
export const TOTAL_COUNT_EXPIRY_SEC = 90 * 24 * 3600;

export class RedisCountService implements CountService {
  constructor(private redis: RedisInterface, private prefix: string) {}

  private async bumpTotal(
    ctx: Context,
    at: number,
    keys: SqrlKey[],
    by: number
  ) {
    await Promise.all(
      keys.map((key) => {
        const redisKey = createRedisKey(
          ctx.requireDatabaseSet(),
          this.prefix,
          key.getHex()
        );
        return Promise.all([
          this.redis.increment(ctx, redisKey, by),
          this.redis.expire(ctx, redisKey, TOTAL_COUNT_EXPIRY_SEC),
        ]);
      })
    );
  }

  private async fetchTotal(
    ctx: Context,
    at: number,
    keys: SqrlKey[]
  ): Promise<number[]> {
    const redisKeys = keys.map((key) => {
      return createRedisKey(
        ctx.requireDatabaseSet(),
        this.prefix,
        key.getHex()
      );
    });
    return this.redis.mgetNumbers(ctx, redisKeys);
  }

  async bump(
    ctx: Context,
    at: number,
    keys: SqrlKey[],
    windowMs: number | null,
    by: number
  ) {
    if (windowMs === null) {
      return this.bumpTotal(ctx, at, keys, by);
    }
    await Promise.all(
      keys.map((key) => {
        const bucketSize = getBucketSize(windowMs, NUM_BUCKETS);
        const currentBucket = getBucketTimeForTimeMs(at, bucketSize);
        const redisKey = getBucketKey(
          ctx.requireDatabaseSet(),
          this.prefix,
          key.getHex(),
          windowMs,
          currentBucket
        );

        return Promise.all([
          this.redis.increment(ctx, redisKey, by),
          this.redis.expire(
            ctx,
            redisKey,
            getCurrentBucketExpirySeconds(windowMs, bucketSize)
          ),
        ]);
      })
    );
  }

  async fetch(
    ctx: Context,
    at: number,
    keys: SqrlKey[],
    windowMs: number | null
  ): Promise<number[]> {
    if (windowMs === null) {
      return this.fetchTotal(ctx, at, keys);
    }
    return Promise.all(
      keys.map(async (key) => {
        const keys = getAllBucketKeys(
          ctx.requireDatabaseSet(),
          this.prefix,
          key,
          at,
          windowMs,
          NUM_BUCKETS
        );

        // Since the oldest bucket partially exists outside of our time window,
        // reduce it proportionally.
        const bucketSize = getBucketSize(windowMs, NUM_BUCKETS);
        const startTime = getWindowStart(at, windowMs);
        const firstBucketTime = getBucketTimeForTimeMs(startTime, bucketSize);
        const firstBucketTimeToExclude = startTime - firstBucketTime;
        const percentOfFirstBucketToInclude =
          (bucketSize - firstBucketTimeToExclude) / bucketSize;

        const values = await this.redis.mgetNumbers(ctx, keys);
        values[0] *= percentOfFirstBucketToInclude;
        const reduced = values.reduce((accum, item) => accum + (item || 0), 0);

        return Math.round(reduced);
      })
    );
  }
}

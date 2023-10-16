/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Context, SqrlKey } from "sqrl";
import { TOTAL_COUNT_EXPIRY_SEC } from "./RedisCountService";
import { RedisInterface, createRedisKey } from "./RedisInterface";

export interface RedisBucketCountInterface {
  bump(
    ctx: Context,
    props: {
      at: number;
      key: SqrlKey;
      amount: number;
    }
  ): Promise<void>;
  count(
    ctx: Context,
    props: {
      key: SqrlKey;
      at: number;
    }
  ): Promise<number>;
}

export class RedisTotalCountService implements RedisBucketCountInterface {
  constructor(private redis: RedisInterface, private prefix: string) {
    /* nothing else */
  }
  async bump(
    ctx: Context,
    props: {
      at: number;
      key: SqrlKey;
      amount: number;
    }
  ): Promise<void> {
    const key = createRedisKey(
      ctx.requireDatabaseSet(),
      this.prefix,
      props.key.getHex()
    );

    await Promise.all([
      this.redis.increment(ctx, key, props.amount),
      this.redis.expire(ctx, key, TOTAL_COUNT_EXPIRY_SEC),
    ]);
  }

  async count(
    ctx: Context,
    props: {
      key: SqrlKey;
      at: number;
    }
  ): Promise<number> {
    const key = createRedisKey(
      ctx.requireDatabaseSet(),
      this.prefix,
      props.key.getHex()
    );
    const values = await this.redis.mgetNumbers(ctx, [key]);
    return values[0];
  }
}

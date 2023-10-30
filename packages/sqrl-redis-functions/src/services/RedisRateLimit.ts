/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import {
  RateLimitService,
  RateLimitProps,
  SessionProps,
} from "../RateLimitFunctions";
import { Context, SqrlKey } from "sqrl";
import { RedisInterface } from "./RedisInterface";

/**
 * Rate limit service based on redis
 */

export class RedisRateLimit implements RateLimitService {
  private prefix: Buffer;
  constructor(private redis: RedisInterface, prefix: string) {
    this.prefix = Buffer.from(prefix, "utf-8");
  }

  async fetch(ctx: Context, props: RateLimitProps): Promise<number[]> {
    return Promise.all(
      props.keys.map((key: SqrlKey): Promise<number> => {
        return this.redis.rateLimitFetch(
          ctx,
          Buffer.concat([this.prefix, key.getBuffer()]),
          {
            maxAmount: props.maxAmount,
            refillTimeMs: props.refillTimeMs,
            refillAmount: props.refillAmount,
            take: props.take,
            at: props.at,
            strict: props.strict,
          }
        );
      })
    );
  }

  async sessionize(ctx: Context, props: SessionProps): Promise<number> {
    return this.redis.sessionize(
      ctx,
      Buffer.concat([this.prefix, props.key.getBuffer()]),
      {
        maxAmount: props.maxAmount,
        refillTimeMs: props.refillTimeMs,
        refillAmount: props.refillAmount,
        take: props.take,
        at: props.at,
        strict: props.strict,
      }
    );
  }
}

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { Context, UniqueId } from "sqrl";
import { invariant } from "sqrl-common";
import { toBufferBE } from "bigint-buffer";
import { RedisInterface, createRedisKey } from "./RedisInterface";

export const TIMESTAMP_BITS = 40;
export const TIMESTAMP_SIZE = Math.pow(2, TIMESTAMP_BITS);
export const TIMESTAMP_EPOCH = 1262304000000; // 2010-01-01

export const REMAINDER_BITS = 23;
export const REMAINDER_SIZE = Math.pow(2, REMAINDER_BITS);

export interface UniqueIdService {
  create(ctx: Context): Promise<UniqueId>;
  fetch(ctx: Context, type: string, value: string): Promise<UniqueId>;
}

export class SimpleId extends UniqueId {
  constructor(private timeMs: number, private remainder: number) {
    super();

    invariant(
      timeMs >= TIMESTAMP_EPOCH && timeMs - TIMESTAMP_EPOCH < TIMESTAMP_SIZE,
      "timeMs value is invalid"
    );
    invariant(
      remainder >= 0 && remainder < REMAINDER_SIZE,
      "timeMs value is invalid"
    );
  }
  getTimeMs(): number {
    return this.timeMs;
  }
  getRemainder(): number {
    return this.remainder;
  }
  getBuffer(): Buffer {
    return toBufferBE(this.getBigInt(), 8);
  }
  getBigInt(): bigint {
    return (
      // tslint:disable-next-line: no-bitwise
      (BigInt(this.timeMs) << BigInt(TIMESTAMP_BITS)) + BigInt(this.remainder)
    );
  }
  getNumberString(): string {
    return this.getBigInt().toString();
  }
}

export type GetTimeMs = () => number;

export class RedisUniqueIdService implements UniqueIdService {
  constructor(
    private redis: RedisInterface,
    private getTimeMs: GetTimeMs,
    private prefix: string
  ) {
    /* do nothing yet */
  }

  private fromSaved(saved: string) {
    const [timeMs, remainder] = JSON.parse(saved);
    return new SimpleId(timeMs, remainder);
  }

  async create(ctx: Context) {
    const timeMs = this.getTimeMs();
    const timeKey = createRedisKey(
      ctx.requireDatabaseSet(),
      this.prefix,
      "time",
      timeMs
    );
    const [remainder] = await Promise.all([
      this.redis.increment(ctx, timeKey),
      this.redis.expire(ctx, timeKey, 1),
    ]);
    return new SimpleId(timeMs, remainder);
  }

  async fetch(ctx: Context, type: string, key: string) {
    const idKey = createRedisKey(
      ctx.requireDatabaseSet(),
      this.prefix,
      "id",
      type,
      key
    );

    // Check if it was already saved
    const saved = await this.redis.get(ctx, idKey);
    if (saved) {
      return this.fromSaved(saved.toString("utf-8"));
    }

    // Create a new one and attempt to save
    const attemptNew = await this.create(ctx);
    const save = JSON.stringify([
      attemptNew.getTimeMs(),
      attemptNew.getRemainder(),
    ]);
    const rv = await this.redis.set(ctx, idKey, save, "NX");
    if (rv) {
      return attemptNew;
    }

    // Someone got a save in the race, use theirs
    const raced = await this.redis.get(ctx, idKey);
    invariant(raced, "Set failed - expected race condition.");
    return this.fromSaved(raced.toString("utf-8"));
  }
}

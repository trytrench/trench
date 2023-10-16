/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Context, SqrlKey } from "sqrl";
import { CountUniqueService } from "../Services";
import { RedisInterface, createRedisKey } from "./RedisInterface";

type CountUniqueData = {
  timestamp: number;
  value: string;
}[];

export class RedisCountUniqueService implements CountUniqueService {
  constructor(private redis: RedisInterface, private prefix: string) {
    /* nothing else */
  }
  async bump(
    ctx: Context,
    props: {
      at: number;
      key: SqrlKey;
      sortedHashes: string[];
      windowMs: number;
    }
  ) {
    const { at, key, sortedHashes } = props;
    const push = sortedHashes.map((hash) => {
      return JSON.stringify({
        timestamp: at,
        value: hash,
      });
    });

    await this.redis.listPush(
      ctx,
      createRedisKey(ctx.requireDatabaseSet(), this.prefix, key.getBuffer()),
      ...push
    );
  }

  private async getData(ctx: Context, key: SqrlKey): Promise<CountUniqueData> {
    const data = await this.redis.getList(
      ctx,
      createRedisKey(ctx.requireDatabaseSet(), this.prefix, key.getBuffer())
    );
    return data.map((entry) => JSON.parse(entry));
  }

  private async getHashes(ctx: Context, key: SqrlKey, windowStartMs: number) {
    const data = await this.getData(ctx, key);
    const hashes = Array.from(
      new Set(
        data
          .filter(({ timestamp }) => timestamp >= windowStartMs)
          .map(({ value }) => value)
      )
    ).sort();
    return hashes;
  }

  async fetchHashes(
    ctx: Context,
    props: { keys: SqrlKey[]; windowStartMs: number }
  ): Promise<string[]> {
    const { keys, windowStartMs } = props;
    if (keys.length === 0) {
      return [];
    }
    const rv: Set<string> = new Set();
    await Promise.all(
      keys.map(async (key) => {
        const hashes = await this.getHashes(ctx, key, windowStartMs);
        for (const hash of hashes) {
          rv.add(hash);
        }
      })
    );
    return Array.from(rv).sort();
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
    const { keys, at, windowMs, addHashes } = props;
    const windowStartMs = at - windowMs;
    return Promise.all(
      keys.map(async (key) => {
        const hashes = await this.fetchHashes(ctx, {
          keys: [key],
          windowStartMs,
        });
        return new Set([...hashes, ...addHashes]).size;
      })
    );
  }
}

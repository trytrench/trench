/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-submodule-imports (@TODO)

import { Context } from "sqrl";
import { RedisInterface, RateLimitOptions } from "../services/RedisInterface";

export class RedisService implements RedisInterface {
  constructor() {
    throw new Error("Redis connections are not available in browser");
  }
  rateLimitFetch(
    ctx: Context,
    key: Buffer,
    opt: RateLimitOptions
  ): Promise<number> {
    throw new Error("Method not implemented.");
  }
  sessionize(
    ctx: Context,
    key: Buffer,
    opt: RateLimitOptions
  ): Promise<number> {
    throw new Error("Method not implemented.");
  }
  increment(ctx: Context, key: Buffer, amount?: number): Promise<number> {
    throw new Error("Method not implemented.");
  }
  get(ctx: Context, key: Buffer): Promise<Buffer> {
    throw new Error("Method not implemented.");
  }
  del(ctx: Context, ...keys: Buffer[]): Promise<number> {
    throw new Error("Method not implemented.");
  }
  set(
    ctx: Context,
    key: Buffer,
    value: string,
    mode?: "NX" | "XX"
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  getList(ctx: Context, key: Buffer): Promise<string[]> {
    throw new Error("Method not implemented.");
  }
  listPush(
    ctx: Context,
    key: Buffer,
    ...values: (string | number | Buffer)[]
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }
  pfcount(ctx: Context, keys: Buffer[]): Promise<number> {
    throw new Error("Method not implemented.");
  }
  pfadd(ctx: Context, key: Buffer, values: string[]): Promise<void> {
    throw new Error("Method not implemented.");
  }
  expire(ctx: Context, key: Buffer, seconds: number): Promise<void> {
    throw new Error("Method not implemented.");
  }
  mgetNumbers(ctx: Context, keys: Buffer[]): Promise<number[]> {
    throw new Error("Method not implemented.");
  }
}

import { Context, DatabaseSet } from "sqrl";
import * as murmurJs from "murmurhash3.js";

export interface RateLimitOptions {
  maxAmount: number;
  refillTimeMs: number;
  refillAmount: number;
  take: number;
  at: number;
  strict: boolean;
}

export interface RedisInterface {
  rateLimitFetch(
    ctx: Context,
    key: Buffer,
    opt: RateLimitOptions
  ): Promise<number>;
  sessionize(ctx: Context, key: Buffer, opt: RateLimitOptions): Promise<number>;
  increment(ctx: Context, key: Buffer, amount?: number): Promise<number>;
  get(ctx: Context, key: Buffer): Promise<Buffer>;
  del(ctx: Context, ...keys: Buffer[]): Promise<number>;
  set(
    ctx: Context,
    key: Buffer,
    value: string,
    mode?: "NX" | "XX"
  ): Promise<boolean>;
  getList(ctx: Context, key: Buffer): Promise<string[]>;
  listPush(
    ctx: Context,
    key: Buffer,
    ...values: Array<string | Buffer | number>
  ): Promise<void>;
  pfcount(ctx: Context, keys: Buffer[]): Promise<number>;
  pfadd(ctx: Context, key: Buffer, values: string[]): Promise<void>;
  expire(ctx: Context, key: Buffer, seconds: number): Promise<void>;
  mgetNumbers(ctx: Context, keys: Buffer[]): Promise<number[]>;
}

export function createRedisKey(
  databaseSet: DatabaseSet,
  prefix: string,
  ...keys: Array<string | number | Buffer>
): Buffer {
  // Use murmurhash to compress the key
  // @NOTE: This method could do with a huge amount of improvements in the
  // future for things such as sharding, non-binary keys, much faster, etc...
  // but for now this is a /good enough/ solution to the problem.
  const parts = [
    databaseSet.getDatasetId(),
    prefix,
    ...keys.map((key) => {
      if (key instanceof Buffer) {
        return key.toString("hex");
      } else {
        return key;
      }
    }),
  ];
  const rv = murmurJs.x64.hash128(JSON.stringify(parts));
  return Buffer.from(rv);
}

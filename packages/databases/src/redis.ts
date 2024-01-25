import { assert } from "common";
import Redis from "ioredis";
import { env } from "./env";

export interface RedisInterface {
  increment(key: Buffer, amount?: number): Promise<number>;
  get(key: Buffer): Promise<Buffer>;
  del(...keys: Buffer[]): Promise<number>;
  set(key: Buffer, value: string, mode?: "NX" | "XX"): Promise<boolean>;
  getList(key: Buffer): Promise<string[]>;
  listPush(
    key: Buffer,
    ...values: Array<string | Buffer | number>
  ): Promise<void>;
  pfcount(keys: Buffer[]): Promise<number>;
  pfadd(key: Buffer, values: string[]): Promise<void>;
  expire(key: Buffer, seconds: number): Promise<void>;
  mgetNumbers(keys: Buffer[]): Promise<number[]>;
  flushdb(): Promise<void>;
}

class RedisService implements RedisInterface {
  // @TODO: IoRedis types are not great. We need to improve them but for now we
  // just use the any type.
  private conn: any;

  constructor(address?: string) {
    this.conn = new Redis(address ?? env.REDIS_URL);
  }

  async ping() {
    return this.conn.ping();
  }
  async increment(key: Buffer, amount: number = 1) {
    return this.conn.incrby(key, amount);
  }
  async get(key: Buffer) {
    return this.conn.get(key);
  }
  async del(...keys: Buffer[]) {
    return this.conn.del(...keys);
  }
  async set(key: Buffer, value: string, mode?: "NX" | "XX") {
    const args = mode ? [mode] : [];
    const rv = await this.conn.set(key, value, ...args);
    if (rv === "OK") {
      return true;
    } else if (rv === null) {
      return false;
    } else {
      throw new Error("Unknown response from Redis set: " + rv);
    }
  }
  async getList(key: Buffer): Promise<string[]> {
    return this.conn.lrange(key, 0, -1);
  }
  async listPush(
    key: Buffer,
    ...values: Array<string | Buffer | number>
  ): Promise<void> {
    await this.conn.lpush(key, ...values);
  }

  async pfcount(keys: Buffer[]): Promise<number> {
    return this.conn.pfcount(...keys);
  }

  async pfadd(key: Buffer, values: string[]): Promise<void> {
    await this.conn.pfaddBuffer(key, ...values);
  }

  async expire(key: Buffer, seconds: number): Promise<void> {
    await this.conn.expire(key, seconds);
  }

  async mgetNumbers(keys: Buffer[]): Promise<number[]> {
    const values = await this.conn.mget(...keys);
    return values.map((value: string) => {
      if (value === null) {
        return value;
      }
      const rv = parseInt(value, 10);
      assert(!isNaN(rv), "Got invalid number in mgetNumbers");
      return rv;
    });
  }

  close() {
    this.conn.disconnect();
  }

  async flushdb() {
    throw new Error("Not implemented");
  }
}

export const redis = new RedisService();

function addressToHostPort(
  address: string,
  defaultPort: number
): [string, number] {
  const split = address.split(":");
  if (split.length === 1) {
    return [split[0]!, defaultPort];
  } else if (split.length === 2) {
    const port = parseInt(split[1]!, 10);
    assert(
      port > 0 && "" + port === split[1],
      `Invalid address: ${address}, port must be a positive integer`
    );
    return [split[0]!, port];
  } else {
    throw new Error("Invalid address: " + address);
  }
}

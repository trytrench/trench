import Redis from "ioredis";
import { assert } from "../../utils";

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

class MockRedisService implements RedisInterface {
  db = new Map<string, any>();

  async increment(key: Buffer, amount = 1) {
    const value = this.db.get(key.toString()) || 0;
    this.db.set(key.toString(), value + amount);
    return value + amount;
  }

  async get(key: Buffer) {
    return this.db.get(key.toString());
  }

  async del(...keys: Buffer[]) {
    let count = 0;
    for (const key of keys) {
      if (this.db.has(key.toString())) {
        count++;
      }
      this.db.delete(key.toString());
    }
    return count;
  }

  async set(key: Buffer, value: string, mode?: "NX" | "XX") {
    if (mode === "NX" && this.db.has(key.toString())) {
      return false;
    }
    this.db.set(key.toString(), value);
    return true;
  }

  async getList(key: Buffer) {
    return this.db.get(key.toString()) || [];
  }

  async listPush(
    key: Buffer,
    ...values: Array<string | Buffer | number>
  ): Promise<void> {
    const list = this.db.get(key.toString()) || [];
    list.push(...values.map((v) => v.toString()));
    this.db.set(key.toString(), list);
  }

  async pfcount(keys: Buffer[]) {
    const set = new Set<string>();
    for (const key of keys) {
      const values = this.db.get(key.toString()) || [];
      for (const value of values) {
        set.add(value);
      }
    }
    return set.size;
  }

  async pfadd(key: Buffer, values: string[]) {
    const set = new Set(this.db.get(key.toString()) || []);
    for (const value of values) {
      set.add(value);
    }
    this.db.set(key.toString(), Array.from(set));
  }

  async expire(key: Buffer, seconds: number) {
    // do nothing
  }

  async mgetNumbers(keys: Buffer[]) {
    const values = await Promise.all(keys.map((key) => this.get(key)));
    return values.map((value) => Number(value));
  }

  async flushdb() {
    this.db.clear();
  }
}

class RedisService implements RedisInterface {
  // @TODO: IoRedis types are not great. We need to improve them but for now we
  // just use the any type.
  private conn: any;

  constructor(address?: string) {
    const [host, port] = addressToHostPort(address || "localhost", 6379);
    this.conn = new Redis({ host, port });
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

var redis: RedisInterface | undefined = undefined;

export function getRedisService() {
  if (!redis) {
    redis = new RedisService();
  }
  return redis;
}

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

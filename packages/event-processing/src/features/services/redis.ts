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

export class MockRedisService implements RedisInterface {
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

export const redis = new MockRedisService();

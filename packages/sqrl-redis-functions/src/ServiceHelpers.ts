/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-submodule-imports (@TODO)

import { LabelService } from "./LabelFunctions";
import { RateLimitService } from "./RateLimitFunctions";
import { RedisService } from "./services/RedisService";
import { MockRedisService } from "./mocks/MockRedisService";
import { RedisCountService } from "./services/RedisCountService";
import { RedisApproxCountUniqueService } from "./services/RedisApproxCountUnique";
import { RedisLabelService } from "./services/RedisLabelService";
import {
  RedisUniqueIdService,
  UniqueIdService,
  GetTimeMs,
} from "./services/RedisUniqueId";
import { RedisRateLimit } from "./services/RedisRateLimit";
import { Config } from "sqrl";
import { CountService, CountUniqueService, Services } from "./Services";
import { RedisInterface } from "./services/RedisInterface";

interface Closeable {
  close(): void;
}

export class RedisServices implements Services {
  count: CountService;
  countUnique: CountUniqueService;
  label: LabelService;
  uniqueId: UniqueIdService;
  rateLimit: RateLimitService;

  private shutdown: Closeable[] = [];
  constructor(config: Config) {
    let getTimeMs: GetTimeMs = () => Date.now();
    if (config["testing.fixed-date"]) {
      const fixedTimeMs = Date.parse(config["testing.fixed-date"]);
      getTimeMs = () => fixedTimeMs;
    }

    let redisService: RedisInterface = null;
    if (config["redis.address"]) {
      const redis = new RedisService(config["redis.address"]);
      redisService = redis;
      this.shutdown.push(redis);
    } else if (config["state.allow-in-memory"]) {
      redisService = new MockRedisService();
    } else {
      throw new Error(
        "No `redis.address` was configured and`state.allow-in-memory` is false."
      );
    }

    this.count = new RedisCountService(redisService, "count~");
    this.countUnique = new RedisApproxCountUniqueService(
      redisService,
      "countUnique~"
    );
    this.label = new RedisLabelService(redisService, "label~");
    this.uniqueId = new RedisUniqueIdService(redisService, getTimeMs, "id~");

    if (!this.rateLimit) {
      this.rateLimit = new RedisRateLimit(redisService, "ratelimit~");
    }
  }

  close() {
    this.shutdown.forEach((svc) => svc.close());
  }
}

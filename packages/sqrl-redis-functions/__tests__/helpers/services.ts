/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { RedisCountService } from "../../src/services/RedisCountService";
import { RedisApproxCountUniqueService } from "../../src/services/RedisApproxCountUnique";
import { RedisLabelService } from "../../src/services/RedisLabelService";
import { MockRedisService } from "../../src/mocks/MockRedisService";
import { RedisRateLimit } from "../../src/services/RedisRateLimit";
import { RedisServices } from "../../src";
import { RedisUniqueIdService } from "../../src/services/RedisUniqueId";

export function buildServices(): RedisServices {
  const redis = new MockRedisService();
  return {
    count: new RedisCountService(redis, "count~"),
    countUnique: new RedisApproxCountUniqueService(redis, "countUnique~"),
    rateLimit: new RedisRateLimit(redis, "ratelimit~"),
    label: new RedisLabelService(redis, "label~"),
    uniqueId: new RedisUniqueIdService(redis, "uniqueId~"),
  };
}

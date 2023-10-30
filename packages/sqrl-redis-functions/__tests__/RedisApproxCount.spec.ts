/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { RedisUniqueIdService } from "../src/services/RedisUniqueId";
import { SqrlEntity, SqrlUniqueId, createSimpleContext } from "sqrl";
import { redisTest } from "./helpers/redisTest";
import { RedisCountService } from "../src/services/RedisCountService";
import { RedisInterface } from "../src/services/RedisInterface";

redisTest("works", async (redis: RedisInterface) => {
  const ctx = createSimpleContext();

  const prefix = "test" + Date.now();

  const uniqueId = new RedisUniqueIdService(redis, () => Date.now(), prefix);
  const service = new RedisCountService(redis, prefix);
  const windowMs = 5000;

  async function getKeyForIp(ip) {
    const entityUniqueId = new SqrlUniqueId(
      await uniqueId.fetch(ctx, "Ip", ip)
    );
    const entityId = new SqrlEntity(entityUniqueId, "Ip", ip);
    const key = await entityId.buildCounterKey(ctx);

    return key;
  }
  const epoch = 1530388687022;

  async function bumpCount(currentTime: number, ip: string) {
    const key = await getKeyForIp(ip);
    await service.bump(ctx, epoch + currentTime, [key], windowMs, 1);
  }
  async function getCount(currentTime: number, ip: string) {
    const key = await getKeyForIp(ip);
    const counts = await service.fetch(
      ctx,
      epoch + currentTime,
      [key],
      windowMs
    );
    return counts[0];
  }

  await bumpCount(0, "1.2.3.4");
  let count = await getCount(10, "1.2.3.4");
  expect(count).toEqual(1);

  count = await getCount(10, "5.6.7.8");
  expect(count).toEqual(0);

  await bumpCount(1000, "a.b.c.d");
  await bumpCount(1100, "a.b.c.d");
  await bumpCount(1200, "a.b.c.d");
  expect(await getCount(1300, "a.b.c.d")).toBe(3);
  expect(await getCount(7000, "a.b.c.d")).toBe(0);

  await bumpCount(4000, "a.b.c.d");
  expect(await getCount(4100, "a.b.c.d")).toBe(4);
  expect(await getCount(7000, "a.b.c.d")).toBe(1);
});

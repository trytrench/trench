/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { DatabaseSet, SqrlKey } from "sqrl";
import { createRedisKey } from "./RedisInterface";

export function getBucketKey(
  databaseSet: DatabaseSet,
  prefix: string,
  key: string,
  windowMs: number,
  bucketTime: number
): Buffer {
  return createRedisKey(databaseSet, prefix, key, windowMs, bucketTime);
}

export function getAllBucketKeys(
  databaseSet: DatabaseSet,
  prefix: string,
  key: SqrlKey,
  timeMs: number,
  windowMs: number,
  numBuckets: number
): Buffer[] {
  const bucketSize = getBucketSize(windowMs, numBuckets);
  const startTime = getWindowStart(timeMs, windowMs);
  const startBucket = getBucketTimeForTimeMs(startTime, bucketSize);
  const keyHex = key.getHex();

  // note the numBuckets + 1. we will over count a bit.
  return Array.from({ length: numBuckets + 1 }, (_, currentBucket) =>
    getBucketKey(
      databaseSet,
      prefix,
      keyHex,
      windowMs,
      startBucket + currentBucket * bucketSize
    )
  );
}

export function getBucketSize(windowMs: number, numBuckets: number): number {
  return Math.floor(windowMs / numBuckets);
}

export function getBucketTimeForTimeMs(
  timeMs: number,
  bucketSize: number
): number {
  return timeMs - (timeMs % bucketSize);
}

export function getCurrentBucketExpirySeconds(
  windowMs: number,
  bucketSize: number
): number {
  return Math.ceil((windowMs + bucketSize) / 1000);
}

export function getWindowStart(timeMs: number, windowMs: number) {
  return timeMs - windowMs;
}

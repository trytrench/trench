import SuperJSON from "superjson";
import * as murmurHash from "./murmurHash3";
import { z } from "zod";
import { dataPathZodSchema } from "../../data-path";
import { timeWindowSchema } from "./timeWindow";
import { tSchemaZod } from "../../data-types";

export function getPastNTimeBuckets(props: {
  timeWindowMs: number;
  eventTimestamp: Date;
  n: number;
}) {
  const { timeWindowMs, eventTimestamp, n } = props;

  const nowMs = eventTimestamp.getTime();
  const nowBucket = Math.floor(nowMs / timeWindowMs);

  const buckets: number[] = [];
  for (let i = 0; i < n; i++) {
    buckets.push(nowBucket - i);
  }
  return buckets;
}

export function hashObject(obj: any): Buffer {
  const string = SuperJSON.stringify(obj);
  const data = Buffer.from(murmurHash.x64.hash128(string));
  return data;
}

/**
 *
 * @param props
 * @returns buckets in descending order
 */
export function getPastNCountBucketHashes(props: {
  timeWindowMs: number;
  counterId: string;
  countBy: string[];
  currentTime: Date;
  n: number;
}) {
  const { timeWindowMs, counterId, countBy, currentTime, n } = props;

  const buckets = getPastNTimeBuckets({
    timeWindowMs,
    eventTimestamp: currentTime,
    n,
  });

  const bucketHashes = buckets.map((bucket) =>
    hashObject({
      bucket,
      counterId,
      countBy,
    })
  );

  return bucketHashes;
}

export const argsSchema = z.array(
  z.object({
    argName: z.string(),
    schema: tSchemaZod,
  })
);

export const counterSchema = z.object({
  id: z.string(),
  timeWindow: timeWindowSchema,
  // countByArgs: argsSchema,
});

export const uniqueCounterSchema = z.object({
  id: z.string(),
  timeWindow: timeWindowSchema,
  // countArgs: argsSchema,
  // countByArgs: argsSchema,
});

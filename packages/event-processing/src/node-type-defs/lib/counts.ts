import SuperJSON from "superjson";
import * as murmurHash from "./murmurHash3";

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

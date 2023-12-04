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
  countFeatureId: string;
  countBy: {
    stringValue: string;
    featureId: string;
  }[];
  eventTimestamp: Date;
  n: number;
}) {
  const { timeWindowMs, countFeatureId, countBy, eventTimestamp, n } = props;

  const buckets = getPastNTimeBuckets({ timeWindowMs, eventTimestamp, n });
  const sortedCountByFeatures = countBy.sort((a, b) => {
    return a.featureId < b.featureId ? -1 : 1;
  });

  const bucketHashes = buckets.map((bucket) =>
    hashObject({
      bucket,
      countFeatureId,
      sortedCountByFeatures,
    })
  );

  return bucketHashes;
}

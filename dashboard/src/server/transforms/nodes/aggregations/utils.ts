import { mapValues } from "lodash";

enum TimeIntervalKey {
  _30minutes = "_30minutes",
  _1hour = "_1hour",
  _3hours = "_3hours",
  _1day = "_1day",
  _1week = "_1week",
  _1month = "_1month",
}

const INTERVALS = {
  [TimeIntervalKey._30minutes]: { interval: "30 minutes", ms: 1000 * 60 * 30 },
  [TimeIntervalKey._1hour]: { interval: "1 hour", ms: 1000 * 3600 },
  [TimeIntervalKey._3hours]: { interval: "3 hours", ms: 1000 * 3600 * 3 },
  [TimeIntervalKey._1day]: { interval: "1 day", ms: 1000 * 3600 * 24 },
  [TimeIntervalKey._1week]: { interval: "1 week", ms: 1000 * 3600 * 24 * 7 },
  [TimeIntervalKey._1month]: { interval: "1 month", ms: 1000 * 3600 * 24 * 30 },
} as const;

type TimeStampedItem<T> = {
  data: T;
  timestamp: Date;
};

export type TimeBucketCounts = Record<TimeIntervalKey, number>;

export type AllCounts = {
  newSeen: TimeBucketCounts;
  totalSeen: TimeBucketCounts;
  allTimeTotal: number;
};

export const MAX_TIME_INTERVAL_MS = Math.max(
  ...Object.values(INTERVALS).map((interval) => interval.ms)
);

export const DEFAULT_TIME_BUCKET_AGGREGATIONS = Object.keys(INTERVALS).reduce(
  (acc, key) => {
    const intervalKey = key as TimeIntervalKey;
    acc[intervalKey] = 0;
    return acc;
  },
  {} as TimeBucketCounts
);

export const DEFAULT_ALL_COUNTS: AllCounts = {
  newSeen: DEFAULT_TIME_BUCKET_AGGREGATIONS,
  totalSeen: DEFAULT_TIME_BUCKET_AGGREGATIONS,
  allTimeTotal: 0,
};

export function createTimeBucketCounts<TItem>(props: {
  timeOfPayment: Date;
  items: TimeStampedItem<TItem>[];
  getTimeBucketCount?: (bucketItems: TimeStampedItem<TItem>[]) => number;
}): TimeBucketCounts {
  const {
    timeOfPayment,
    items,
    getTimeBucketCount = (items) => items.length,
  } = props;

  return mapValues(INTERVALS, (interval) => {
    const cutoff = new Date(timeOfPayment.getTime() - interval.ms);
    return getTimeBucketCount(items.filter((item) => item.timestamp >= cutoff));
  });
}

export function createAllCounts<
  T extends { firstSeen: Date; lastSeen: Date }
>(props: { timeOfPayment: Date; links: T[] }): AllCounts {
  const { timeOfPayment, links } = props;

  const newSeen = createTimeBucketCounts({
    timeOfPayment,
    items: links.map((link) => ({
      data: link,
      timestamp: new Date(link.firstSeen),
    })),
  });
  const totalSeen = createTimeBucketCounts({
    timeOfPayment,
    items: links.map((link) => ({
      data: link,
      timestamp: new Date(link.lastSeen),
    })),
  });
  const allTimeTotal = links.length;

  return {
    newSeen,
    totalSeen,
    allTimeTotal,
  };
}

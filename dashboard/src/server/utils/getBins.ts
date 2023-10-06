import { uniq } from "lodash";

export const getBins = (
  data: { time: string; label: string; count: number }[]
) => {
  const binData = data.reduce((acc, bin) => {
    if (!acc[bin.time]) acc[bin.time] = {};
    acc[bin.time]![bin.label] = bin.count;
    return acc;
  }, {} as Record<string, Record<string, number>>);

  const times = uniq(data.map((bin) => bin.time));
  const labels = uniq(data.map((bin) => bin.label).filter(Boolean));

  const allBins: Record<string, Record<string, number>> = {};
  for (const time of times) {
    for (const label of labels) {
      if (!allBins[time]) allBins[time] = {};
      allBins[time]![label] = binData[time]?.[label] ?? 0;
    }
  }
  return allBins;
};

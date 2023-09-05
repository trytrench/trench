import { addDays, format } from "date-fns";
import { api } from "../utils/api";
import { useMemo } from "react";
import { AreaChart, Card, Title, type Color } from "@tremor/react";
import { useEntityFilters, useEventFilters } from "./Filters";
import { type EventFilters, type EntityFilters } from "../shared/validation";

export function EntityTimeChart({
  entityFilters,
  eventFilters,
  title,
  color = "gray",
}: {
  title: string;
  color?: Color;
  entityFilters?: Partial<EntityFilters>;
  eventFilters?: Partial<EventFilters>;
}) {
  const actualEventFilters = useEventFilters(eventFilters);
  const actualEntityFilters = useEntityFilters(entityFilters);

  const { data: timeBuckets } = api.entities.getTimeBuckets.useQuery(
    {
      interval: 1000 * 60 * 60 * 24,
      start: actualEventFilters.dateRange?.start ?? 0,
      end: actualEventFilters.dateRange?.end ?? 0,
      entityFilters: actualEntityFilters,
      eventFilters: actualEventFilters,
    },
    {
      enabled: true,
    }
  );

  const totalCount = timeBuckets?.reduce(
    (acc, bucket) => acc + bucket.count,
    0
  );

  if (totalCount === 0) {
    return null;
  }

  return (
    <Card className="">
      <Title>{title}</Title>
      <AreaChart
        className="h-72 mt-4"
        data={
          timeBuckets?.map((bucket) => ({
            date: format(addDays(new Date(bucket.bucket), 1), "MMM d"),
            [title]: Number(bucket.count),
          })) ?? []
        }
        index="date"
        categories={[title]}
        colors={[color || "gray"]}
      />
    </Card>
  );
}

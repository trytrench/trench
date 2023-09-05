import { addDays, format } from "date-fns";
import { api } from "../utils/api";
import { useMemo } from "react";
import { AreaChart, Card, Title, type Color } from "@tremor/react";
import { useEntityFilters, useEventFilters } from "../components/Filters";
import { EntityFilters, type EventFilters } from "../shared/validation";

export function EventTimeChart({
  eventFilters,
  entityFilters,
  title,
  legend = title,
  color = "gray",
}: {
  color?: Color;
  title: string;
  legend?: string;
  eventFilters?: Partial<EventFilters>;
  entityFilters?: Partial<EntityFilters>;
}) {
  const actualEventFilters = useEventFilters(eventFilters);
  const actualEntityFilters = useEntityFilters(entityFilters);

  const { data: timeBuckets } = api.events.getTimeBuckets.useQuery(
    {
      interval: 1000 * 60 * 60 * 24,
      start: actualEventFilters.dateRange?.start ?? 0,
      end: actualEventFilters.dateRange?.end ?? 0,
      eventFilters: actualEventFilters,
      entityFilters: actualEntityFilters,
    },
    {
      enabled: true,
    }
  );

  return (
    <Card>
      <Title>{title}</Title>
      <AreaChart
        className="h-72 mt-4"
        data={
          timeBuckets?.map((bucket) => ({
            date: format(addDays(new Date(bucket.bucket), 1), "MMM d"),
            [legend]: Number(bucket.count),
          })) ?? []
        }
        index="date"
        categories={[legend]}
        colors={[color || "gray"]}
      />
    </Card>
  );
}

import { addDays, format } from "date-fns";
import { api } from "../utils/api";
import { Card, Title, type Color } from "@tremor/react";
import { useEntityFilters, useEventFilters } from "./Filters";
import { type EventFilters, type EntityFilters } from "../shared/validation";
import { AreaChart } from "@trytrench/tremor";

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

  const { data } = api.entities.getTimeBuckets.useQuery(
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

  const timeBuckets = data?.data;
  const labels = data?.labels;

  return (
    <Card className="">
      <Title>{title}</Title>
      <AreaChart
        className="h-72 mt-4"
        data={
          timeBuckets?.map((bucket) => {
            return {
              date: format(addDays(new Date(bucket.bucket), 1), "MMM d"),
              ...bucket.counts,
            };
          }) ?? []
        }
        index="date"
        categories={labels?.map((label) => label.label) ?? []}
        colors={labels?.map((label) => label.color) ?? []}
        tooltipOrder="byValue"
      />
    </Card>
  );
}

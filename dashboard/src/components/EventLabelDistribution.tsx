import { api } from "../utils/api";
import { useMemo } from "react";
import { BarList, type BarListProps, Card, Title } from "@tremor/react";
import { useEntityFilters, useEventFilters } from "../components/Filters";
import { type EntityFilters, type EventFilters } from "../shared/validation";

export function EventLabelDistribution({
  eventFilters,
  entityFilters,
  title,
}: {
  eventFilters?: Partial<EventFilters>;
  entityFilters?: Partial<EntityFilters>;
  title: string;
}) {
  const actualEventFilters = useEventFilters(eventFilters);
  const actualEntityFilters = useEntityFilters(entityFilters);

  const { data: labelDists } = api.events.getEventLabelDistributions.useQuery(
    { eventFilters: actualEventFilters, entityFilters: actualEntityFilters },
    { enabled: true }
  );

  const eventLabelBarData: BarListProps["data"] = useMemo(() => {
    return [
      ...(labelDists?.map((label) => ({
        name: label.label ?? "No label",
        value: label.count,
      })) ?? []),
    ];
  }, [labelDists]);

  return (
    <Card>
      <Title>{title}</Title>
      <div className="h-2"></div>
      <BarList data={eventLabelBarData} />
    </Card>
  );
}

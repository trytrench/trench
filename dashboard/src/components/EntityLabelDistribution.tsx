import { api } from "../utils/api";
import { useMemo } from "react";
import { type BarListProps, Card, Title, BarList } from "@tremor/react";
import { useEntityFilters, useEventFilters } from "./Filters";
import { type EntityFilters, type EventFilters } from "../shared/validation";
import { useRouter } from "next/router";

export function EntityLabelDistribution({
  entityFilters,
  eventFilters,
  title,
}: {
  eventFilters?: Partial<EventFilters>;
  entityFilters?: Partial<EntityFilters>;
  title: string;
}) {
  const actualEventFilters = useEventFilters(eventFilters);
  const actualEntityFilters = useEntityFilters(entityFilters);

  const { data: labelDists } = api.events.getEntityLabelDistributions.useQuery(
    { eventFilters: actualEventFilters, entityFilters: actualEntityFilters },
    { enabled: true }
  );
  const entityLabelBarData: BarListProps["data"] = useMemo(() => {
    return [
      ...(labelDists?.map((label) => ({
        name: label.label,
        value: label.count,
        color: label.color,
      })) ?? []),
    ];
  }, [labelDists]);

  return (
    <Card>
      <Title>{title}</Title>
      <div className="h-2"></div>
      <BarList data={entityLabelBarData} />
    </Card>
  );
}

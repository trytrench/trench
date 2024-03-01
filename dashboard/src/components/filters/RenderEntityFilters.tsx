import { api } from "~/utils/api";
import { EntityFilter, EntityFilterType } from "../../shared/validation";
import { DateRangeChip, FeatureFilterChip, TypeChip } from "./Chips";

interface Props {
  filters: EntityFilter[];
  onFiltersChange: (filters: EntityFilter[]) => void;
}

export function RenderEntityFilters({ filters, onFiltersChange }: Props) {
  const { data: allEntityTypes } = api.entityTypes.list.useQuery();

  return (
    <div className="mr-auto ml-3 flex gap-1 flex-wrap">
      {filters.map((filter, idx) => {
        switch (filter.type) {
          case EntityFilterType.EntityType:
            const typeName = allEntityTypes?.find((t) => t.id === filter.data)
              ?.type;
            return (
              <TypeChip
                type={typeName ?? "Unknown type"}
                onDelete={() => {
                  onFiltersChange(
                    filters.filter(
                      (f) => f.type !== EntityFilterType.EntityType
                    )
                  );
                }}
              />
            );
          case EntityFilterType.FirstSeen:
            return (
              <DateRangeChip
                title="First Seen"
                dateRange={{
                  from: filter.data.from,
                  to: filter.data.to,
                }}
                onDelete={() => {
                  onFiltersChange(
                    filters.filter((f) => f.type !== EntityFilterType.FirstSeen)
                  );
                }}
              />
            );
          case EntityFilterType.LastSeen:
            return (
              <DateRangeChip
                title="Last Seen"
                dateRange={{
                  from: filter.data.from,
                  to: filter.data.to,
                }}
                onDelete={() => {
                  onFiltersChange(
                    filters.filter((f) => f.type !== EntityFilterType.LastSeen)
                  );
                }}
              />
            );
          case EntityFilterType.Feature:
            return (
              <FeatureFilterChip
                filter={filter.data}
                onDelete={() => {
                  // based on idx
                  onFiltersChange(filters.filter((_, i) => i !== idx));
                }}
                onChange={(newFilter) => {
                  const newFilters: EntityFilter[] = filters.map((f, i) =>
                    i === idx
                      ? {
                          type: EntityFilterType.Feature,
                          data: newFilter,
                        }
                      : f
                  );
                  onFiltersChange(newFilters);
                }}
              />
            );
          case EntityFilterType.SeenInEventType:
            return (
              <TypeChip
                title="Event"
                type={filter.data}
                onDelete={() => {
                  onFiltersChange(
                    filters.filter(
                      (f) => f.type !== EntityFilterType.SeenInEventType
                    )
                  );
                }}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

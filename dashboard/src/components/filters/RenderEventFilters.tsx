import { EventFilter, EventFilterType } from "../../shared/validation";
import { DateRangeChip, FeatureFilterChip, TypeChip } from "./Chips";

interface Props {
  filters: EventFilter[];
  onFiltersChange: (filters: EventFilter[]) => void;
}

export function RenderEventFilters({ filters, onFiltersChange }: Props) {
  return (
    <div className="mr-auto ml-3 flex gap-1 flex-wrap">
      {filters.map((filter, idx) => {
        switch (filter.type) {
          case EventFilterType.EventType:
            return (
              <TypeChip
                type={filter.data}
                onDelete={() => {
                  onFiltersChange(
                    filters.filter((f) => f.type !== EventFilterType.EventType)
                  );
                }}
              />
            );
          case EventFilterType.DateRange:
            return (
              <DateRangeChip
                dateRange={{
                  from: filter.data.from,
                  to: filter.data.to,
                }}
                onDelete={() => {
                  onFiltersChange(
                    filters.filter((f) => f.type !== EventFilterType.DateRange)
                  );
                }}
              />
            );
          case EventFilterType.Feature:
            return (
              <FeatureFilterChip
                filter={filter.data}
                onDelete={() => {
                  // based on the index, remove the filter from the array
                  onFiltersChange(filters.filter((f, i) => i !== idx));
                }}
                onChange={(newFilter) => {
                  onFiltersChange(
                    filters.map((f, i) =>
                      i === idx
                        ? { type: EventFilterType.Feature, data: newFilter }
                        : f
                    )
                  );
                }}
              />
            );
        }
      })}
    </div>
  );
}

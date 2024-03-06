import { EventFilter, EventFilterType } from "../../shared/validation";
import { DateRangeChip, FeatureFilterChip, TypeChip } from "./Chips";

interface Props {
  filters: EventFilter[];
  onFiltersChange: (filters: EventFilter[]) => void;
  editable?: boolean;
  renderWrapper?: (children: React.ReactNode) => React.ReactNode;
  renderPlaceholder?: (props: {
    renderWrapper: (children: React.ReactNode) => React.ReactNode;
  }) => React.ReactNode;
}

export function RenderEventFilters({
  filters,
  onFiltersChange,
  editable = false,
  renderWrapper = (children) => children,
  renderPlaceholder = ({ renderWrapper }) =>
    renderWrapper(
      <div className="text-xs text-muted-foreground">No filters</div>
    ),
}: Props) {
  if (filters.length === 0) {
    return <>{renderPlaceholder({ renderWrapper })}</>;
  }
  return (
    <>
      {filters
        .map((filter, idx) => {
          switch (filter.type) {
            case EventFilterType.EventType:
              return (
                <TypeChip
                  type={filter.data}
                  onDelete={() => {
                    onFiltersChange(
                      filters.filter(
                        (f) => f.type !== EventFilterType.EventType
                      )
                    );
                  }}
                  isEditable={editable}
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
                      filters.filter(
                        (f) => f.type !== EventFilterType.DateRange
                      )
                    );
                  }}
                  isEditable={editable}
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
                  isEditable={editable}
                />
              );
          }
        })
        .map(renderWrapper)}
    </>
  );
}

import { EventFilters } from "../../shared/validation";
import { DateRangeChip, FeatureFilterChip, TypeChip } from "./Chips";

interface Props {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
}

export function RenderEventFilters({ filters, onFiltersChange }: Props) {
  const { dateRange, eventType, features: featureFilters } = filters;

  return (
    <div className="mr-auto ml-3 flex gap-1 flex-wrap">
      {eventType && (
        <TypeChip
          type={eventType}
          onDelete={() => {
            onFiltersChange({
              ...filters,
              eventType: undefined,
            });
          }}
        />
      )}

      {dateRange?.from && dateRange.to && (
        <DateRangeChip
          dateRange={{
            from: dateRange.from,
            to: dateRange.to,
          }}
          onDelete={() => {
            onFiltersChange({
              ...filters,
              dateRange: undefined,
            });
          }}
        />
      )}

      {featureFilters?.map((filter, idx) => (
        <FeatureFilterChip
          key={idx}
          filter={filter}
          onDelete={() => {
            const newFeatures = featureFilters?.filter((_, i) => i !== idx);
            onFiltersChange({
              ...filters,
              features: newFeatures,
            });
          }}
          onChange={(newFilter) => {
            const newFeatures = featureFilters?.map((f, i) =>
              i === idx ? newFilter : f
            );
            onFiltersChange({
              ...filters,
              features: newFeatures,
            });
          }}
        />
      ))}
    </div>
  );
}

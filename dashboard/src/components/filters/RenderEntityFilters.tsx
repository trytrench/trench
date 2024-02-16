import { api } from "~/utils/api";
import { EntityFilters } from "../../shared/validation";
import { DateRangeChip, FeatureFilterChip, TypeChip } from "./Chips";

interface Props {
  filters: EntityFilters;
  onFiltersChange: (filters: EntityFilters) => void;
}

export function RenderEntityFilters({ filters, onFiltersChange }: Props) {
  const {
    firstSeen,
    lastSeen,
    entityType,
    features: featureFilters,
    seenInEventType,
  } = filters;

  const { data: allEntityTypes } = api.entityTypes.list.useQuery();

  const entityTypeObj = allEntityTypes?.find((e) => e.id === entityType);

  return (
    <div className="mr-auto ml-3 flex gap-1 flex-wrap">
      {entityType && (
        <TypeChip
          type={entityTypeObj?.type ?? ""}
          onDelete={() => {
            onFiltersChange({
              ...filters,
              entityType: undefined,
            });
          }}
        />
      )}

      {firstSeen?.from && firstSeen.to && (
        <DateRangeChip
          title="First Seen"
          dateRange={{
            from: firstSeen.from,
            to: firstSeen.to,
          }}
          onDelete={() => {
            onFiltersChange({
              ...filters,
              firstSeen: undefined,
            });
          }}
        />
      )}

      {lastSeen?.from && lastSeen.to && (
        <DateRangeChip
          title="Last Seen"
          dateRange={{
            from: lastSeen.from,
            to: lastSeen.to,
          }}
          onDelete={() => {
            onFiltersChange({
              ...filters,
              lastSeen: undefined,
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

      {seenInEventType && (
        <TypeChip
          title="Event"
          type={seenInEventType}
          onDelete={() => {
            onFiltersChange({
              ...filters,
              seenInEventType: undefined,
            });
          }}
        />
      )}
    </div>
  );
}

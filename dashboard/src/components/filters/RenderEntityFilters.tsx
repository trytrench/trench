import { api } from "~/utils/api";
import { EntityFilter, EntityFilterType } from "../../shared/validation";
import { DateRangeChip, FeatureFilterChip, TypeChip } from "./Chips";

interface Props {
  filters: EntityFilter[];
  onFiltersChange: (filters: EntityFilter[]) => void;
  editable?: boolean;
  renderWrapper?: (children: React.ReactNode, idx: number) => React.ReactNode;
  renderPlaceholder?: (props: {
    renderWrapper: (children: React.ReactNode, idx: number) => React.ReactNode;
  }) => React.ReactNode;
}

export function RenderEntityFilters(props: Props) {
  const {
    filters,
    onFiltersChange,
    editable = false,
    renderWrapper = (x) => x,
    renderPlaceholder = ({ renderWrapper }) =>
      renderWrapper(
        <div className="text-xs text-muted-foreground">No filters</div>,
        -1
      ),
  } = props;
  const { data: allEntityTypes } = api.entityTypes.list.useQuery();

  const sortedFilters = filters.sort((a, b) => {
    // First seen and last seen should always be first, then entity type, then features
    if (a.type === EntityFilterType.FirstSeen) return -1;
    if (b.type === EntityFilterType.FirstSeen) return 1;
    if (a.type === EntityFilterType.LastSeen) return -1;
    if (b.type === EntityFilterType.LastSeen) return 1;
    if (a.type === EntityFilterType.EntityType) return -1;
    if (b.type === EntityFilterType.EntityType) return 1;
    return 0;
  });

  if (filters.length === 0) {
    return <>{renderPlaceholder({ renderWrapper })}</>;
  }
  return (
    <>
      {filters
        .map((filter, idx) => {
          switch (filter.type) {
            case EntityFilterType.EntityType:
              const typeName = allEntityTypes?.find((t) => t.id === filter.data)
                ?.type;
              return (
                <TypeChip
                  type={typeName ?? "Unknown type"}
                  isEditable={editable}
                  onDelete={
                    editable
                      ? () => {
                          onFiltersChange(
                            filters.filter(
                              (f) => f.type !== EntityFilterType.EntityType
                            )
                          );
                        }
                      : undefined
                  }
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
                  isEditable={editable}
                  onDelete={
                    editable
                      ? () => {
                          onFiltersChange(
                            filters.filter(
                              (f) => f.type !== EntityFilterType.FirstSeen
                            )
                          );
                        }
                      : undefined
                  }
                />
              );
            case EntityFilterType.LastSeen:
              return (
                <DateRangeChip
                  title="Last Seen"
                  isEditable={editable}
                  dateRange={{
                    from: filter.data.from,
                    to: filter.data.to,
                  }}
                  onDelete={
                    editable
                      ? () => {
                          onFiltersChange(
                            filters.filter(
                              (f) => f.type !== EntityFilterType.LastSeen
                            )
                          );
                        }
                      : undefined
                  }
                />
              );
            case EntityFilterType.Feature:
              return (
                <FeatureFilterChip
                  filter={filter.data}
                  isEditable={editable}
                  onDelete={
                    editable
                      ? () => {
                          // based on idx
                          onFiltersChange(filters.filter((_, i) => i !== idx));
                        }
                      : undefined
                  }
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
                  isEditable={editable}
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
        })
        .map(renderWrapper)}
    </>
  );
}

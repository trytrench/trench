import { ListFilter } from "lucide-react";
import { type EntityFilters } from "../../shared/validation";
import { api } from "../../utils/api";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { AddFeatureFilterSubItem } from "./AddFeatureFilterSubItem";
import { DateRangeChip, FeatureFilterChip, TypeChip } from "./Chips";
import { TypeSelectorSubItem } from "./TypeSelectorSubItem";
import { AddEventFilterSubItem } from "./EventFilterSubItem";

interface EditEntityFiltersProps {
  value: EntityFilters;
  onChange: (value: EntityFilters) => void;
}

export function EditEntityFilters(props: EditEntityFiltersProps) {
  const { value, onChange } = props;

  const { data: allEntityTypes } = api.entityTypes.list.useQuery();
  const { data: allFeatureDefs } = api.features.list.useQuery();

  const {
    firstSeen,
    lastSeen,
    entityType,
    features: featureFilters,
    seenInEventType,
  } = value;

  const filteredFeatureDefs = allFeatureDefs?.filter((f) => {
    if (!entityType) return true;
    return f.entityTypeId === entityType;
  });

  const entityTypeObj = allEntityTypes?.find((e) => e.id === entityType);

  return (
    <>
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="p-1 px-2 my-auto h-6 flex items-center hover:bg-muted hover:text-muted-foreground"
            >
              <ListFilter className="h-4 w-4 mr-1.5" />
              <span className="text-xs">Filter</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {/* First Seen / Last Seen Filter */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>First Seen</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={firstSeen?.from}
                  selected={{
                    from: firstSeen?.from,
                    to: firstSeen?.to,
                  }}
                  onSelect={(newRange) => {
                    onChange({
                      ...value,
                      firstSeen: newRange,
                    });
                  }}
                  numberOfMonths={2}
                />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Last Seen</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={lastSeen?.from}
                  selected={{
                    from: lastSeen?.from,
                    to: lastSeen?.to,
                  }}
                  onSelect={(newRange) => {
                    onChange({
                      ...value,
                      lastSeen: newRange,
                    });
                  }}
                  numberOfMonths={2}
                />
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <AddEventFilterSubItem
              onAdd={(eventType) => {
                onChange({
                  ...value,
                  seenInEventType: eventType,
                });
              }}
            />

            {/* Type Filter */}
            <TypeSelectorSubItem
              types={
                allEntityTypes?.map((e) => ({
                  id: e.id,
                  name: e.type,
                })) ?? []
              }
              value={entityType ?? null}
              onChange={(type) => {
                onChange({
                  ...value,
                  entityType: type,
                });
              }}
            />

            {/* Feature Filter*/}
            <AddFeatureFilterSubItem
              featureDefs={filteredFeatureDefs ?? []}
              onAdd={(feature) => {
                const featuresArr = featureFilters ?? [];
                onChange({
                  ...value,
                  features: [...featuresArr, feature],
                });
              }}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mr-auto ml-3 flex gap-1 flex-wrap">
        {entityType && (
          <TypeChip
            type={entityTypeObj?.type ?? ""}
            onDelete={() => {
              onChange({
                ...value,
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
              onChange({
                ...value,
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
              onChange({
                ...value,
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
              onChange({
                ...value,
                features: newFeatures,
              });
            }}
            onChange={(newFilter) => {
              const newFeatures = featureFilters?.map((f, i) =>
                i === idx ? newFilter : f
              );
              onChange({
                ...value,
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
              onChange({
                ...value,
                seenInEventType: undefined,
              });
            }}
          />
        )}
      </div>
    </>
  );
}

import { ListFilter, Plus } from "lucide-react";
import {
  getEventFiltersOfType,
  type EntityFilter,
  EntityFilterType,
  getEntityFiltersOfType,
} from "../../shared/validation";
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
import { AddEventFilterSubItem } from "./EventFilterSubItem";
import { TypeSelectorSubItem } from "./TypeSelectorSubItem";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

interface EditEntityFiltersProps {
  value: EntityFilter[];
  existingFilters?: EntityFilter[];
  onChange: (value: EntityFilter[]) => void;
}

export function EditEntityFilters(props: EditEntityFiltersProps) {
  const { value, onChange, existingFilters = value } = props;

  const handleChange = (newValue: EntityFilter[]) => {
    onChange(newValue);
  };

  const { data: allEntityTypes } = api.entityTypes.list.useQuery();
  const { data: allFeatureDefs } = api.features.list.useQuery();

  const firstSeen = getEntityFiltersOfType(
    existingFilters,
    EntityFilterType.FirstSeen
  )?.[0]?.data;
  const lastSeen = getEntityFiltersOfType(
    existingFilters,
    EntityFilterType.LastSeen
  )?.[0]?.data;
  const entityType = getEntityFiltersOfType(
    existingFilters,
    EntityFilterType.EntityType
  )?.[0]?.data;
  const featureFilters = getEntityFiltersOfType(
    existingFilters,
    EntityFilterType.Feature
  )?.map((f) => f.data);
  const seenInEventType = getEntityFiltersOfType(
    existingFilters,
    EntityFilterType.SeenInEventType
  )?.[0]?.data;

  const filteredFeatureDefs = allFeatureDefs?.filter((f) => {
    if (!entityType) return true;
    return f.entityTypeId === entityType;
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-md flex items-center p-1 data-[state=open]:bg-muted hover:bg-muted transition">
          <Plus className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {/* Type Filter */}
        {!entityType && (
          <TypeSelectorSubItem
            types={
              allEntityTypes?.map((e) => ({
                id: e.id,
                name: e.type,
              })) ?? []
            }
            value={entityType ?? null}
            onChange={(type) => {
              handleChange([
                ...value.filter((f) => f.type !== EntityFilterType.EntityType),
                { type: EntityFilterType.EntityType, data: type },
              ]);
            }}
          />
        )}

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
                if (!newRange) {
                  return;
                }
                handleChange([
                  ...value.filter((f) => f.type !== EntityFilterType.FirstSeen),
                  { type: EntityFilterType.FirstSeen, data: newRange },
                ]);
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
                if (!newRange) {
                  return;
                }
                handleChange([
                  ...value.filter((f) => f.type !== EntityFilterType.LastSeen),
                  { type: EntityFilterType.LastSeen, data: newRange },
                ]);
              }}
              numberOfMonths={2}
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <AddEventFilterSubItem
          onAdd={(eventType) => {
            handleChange([
              ...value.filter(
                (f) => f.type !== EntityFilterType.SeenInEventType
              ),
              { type: EntityFilterType.SeenInEventType, data: eventType },
            ]);
          }}
        />

        {/* Feature Filter*/}
        {entityType && (
          <AddFeatureFilterSubItem
            featureDefs={filteredFeatureDefs ?? []}
            onAdd={(feature) => {
              handleChange([
                ...value,
                { type: EntityFilterType.Feature, data: feature },
              ]);
            }}
          />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

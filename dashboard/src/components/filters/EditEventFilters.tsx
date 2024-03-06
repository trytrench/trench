import { ListFilter } from "lucide-react";
import {
  EventFilter,
  EventFilterType,
  getEventFiltersOfType,
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
import { TypeSelectorSubItem } from "./TypeSelectorSubItem";

interface EditEventFiltersProps {
  value: EventFilter[];
  existingFilters?: EventFilter[];
  onChange: (value: EventFilter[]) => void;
}

export function EditEventFilters(props: EditEventFiltersProps) {
  const { value, onChange, existingFilters = value } = props;

  const { data: allEventTypes } = api.eventTypes.list.useQuery();
  const { data: allFeatureDefs } = api.features.list.useQuery();

  // const { dateRange, eventType, features: featureFilters } = value;

  const dateRange = getEventFiltersOfType(
    existingFilters,
    EventFilterType.DateRange
  )?.[0]?.data;
  const eventType = getEventFiltersOfType(
    existingFilters,
    EventFilterType.EventType
  )?.[0]?.data;
  const featureFilters = getEventFiltersOfType(
    existingFilters,
    EventFilterType.Feature
  )?.map((f) => f.data);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          // className="p-1 px-2 my-auto h-6 flex items-center hover:bg-muted hover:text-muted-foreground"
        >
          <ListFilter className="h-4 w-4 mr-1.5" />
          <span className="text-xs">Filter</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {/* Date Range Filter */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Date Range</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={{
                from: dateRange?.from,
                to: dateRange?.to,
              }}
              onSelect={(newRange) => {
                if (!newRange) {
                  return;
                }
                onChange([
                  ...value.filter((f) => f.type !== EventFilterType.DateRange),
                  { type: EventFilterType.DateRange, data: newRange },
                ]);
              }}
              numberOfMonths={2}
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Type Filter */}
        <TypeSelectorSubItem
          types={
            allEventTypes?.map((e) => ({
              id: e.id,
              name: e.id,
            })) ?? []
          }
          value={eventType ?? null}
          onChange={(type) => {
            onChange([
              ...value.filter((f) => f.type !== EventFilterType.EventType),
              { type: EventFilterType.EventType, data: type },
            ]);
          }}
        />

        {/* Feature Filter*/}
        <AddFeatureFilterSubItem
          featureDefs={allFeatureDefs ?? []}
          onAdd={(feature) => {
            onChange([
              ...value,
              { type: EventFilterType.Feature, data: feature },
            ]);
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

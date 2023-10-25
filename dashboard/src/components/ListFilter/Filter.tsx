// universal filter component - works for both entities and events

import {
  Check,
  Hash,
  ListFilter,
  LucideIcon,
  ToggleLeft,
  Type,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Badge } from "../ui/badge";
import { Calendar } from "../ui/calendar";
import type { DateRange } from "react-day-picker";
import { GenericFilters } from "~/shared/validation";
import { JsonFilter, JsonFilterOp } from "~/shared/jsonFilter";

import { ulid } from "ulid";
import { JsonFilterChip, LabelChip, TypeChip } from "./FilterChips";

const dataTypeToIcon = {
  number: Hash,
  boolean: ToggleLeft,
  text: Type,
} as Record<string, LucideIcon>;

interface Props {
  options: {
    types: string[];
    labels: string[];
    features: { feature: string; dataType: string }[];
  };
  onChange: (filter: GenericFilters) => void;
}

function Filter(props: Props) {
  const { options, onChange } = props;

  const [selectedType, setSelectedType] = useState<string | null>(null);
  // const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [jsonFilters, setJsonFilters] = useState<
    { id: string; filter: JsonFilter }[]
  >([]);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    onChange({
      dateRange: undefined,
      type: selectedType ?? undefined,
      labels: selectedLabels.length > 0 ? selectedLabels : undefined,
      features: jsonFilters.map((e) => e.filter),
    });
  }, [selectedType, selectedLabels, jsonFilters, dateRange]);

  return (
    <>
      <div className="flex gap-1.5 items-center pr-3 border-r">
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
            {/* Type Filter */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Type</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {options.types.map((type) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => {
                      setSelectedType(type);
                    }}
                    className="relative pl-8"
                  >
                    <TypeChip type={type} className="shadow-sm" />

                    {selectedType === type && (
                      <Check className="absolute w-4 h-4 left-2 top-2" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Labels Filter */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Labels</DropdownMenuSubTrigger>

              <DropdownMenuSubContent>
                <Command>
                  <CommandInput placeholder="Search Labels..." autoFocus />
                  <CommandList>
                    <CommandEmpty>No labels found.</CommandEmpty>
                    <CommandGroup>
                      {options.labels.map((label) => (
                        <CommandItem
                          key={label}
                          onSelect={() => {
                            if (!selectedLabels.includes(label)) {
                              setSelectedLabels([...selectedLabels, label]);
                            } else {
                              setSelectedLabels(
                                selectedLabels.filter((l) => l !== label)
                              );
                            }
                          }}
                          className="pl-8 relative"
                        >
                          {selectedLabels.includes(label) && (
                            <Check className="absolute w-4 h-4 left-2 top-2" />
                          )}

                          <LabelChip label={label} className="shadow-sm" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Features</DropdownMenuSubTrigger>

              <DropdownMenuSubContent className="w-[16rem]">
                <Command>
                  <CommandInput placeholder="Search Features..." />
                  <CommandList>
                    <CommandEmpty>No results.</CommandEmpty>
                    <CommandGroup>
                      {options.features.map((feature) => {
                        const DataTypeIcon =
                          dataTypeToIcon[feature.dataType] ?? Type;
                        return (
                          <CommandItem
                            key={feature.feature}
                            value={feature.feature}
                            className="pl-8"
                            onSelect={() => {
                              setJsonFilters([
                                ...jsonFilters,
                                {
                                  id: ulid(),
                                  filter: {
                                    path: feature.feature,
                                    dataType: feature.dataType,
                                    op: JsonFilterOp.NotEmpty,
                                    value: undefined,
                                  },
                                },
                              ]);
                            }}
                          >
                            <DataTypeIcon className="w-4 h-4 absolute left-2 top-2" />
                            {feature.feature}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Date Range */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Date Range</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <Calendar
                  initialFocus
                  mode="range"
                  // defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  // numberOfMonths={2}
                />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mr-auto ml-3 flex gap-1 flex-wrap">
        {selectedType && (
          <TypeChip
            type={selectedType}
            onDelete={() => {
              setSelectedType(null);
            }}
          />
        )}
        {selectedLabels.map((label) => (
          <LabelChip
            label={label}
            onDelete={() => {
              setSelectedLabels(selectedLabels.filter((l) => l !== label));
            }}
          />
        ))}
        {jsonFilters.map((entry) => (
          <JsonFilterChip
            key={entry.id}
            value={entry}
            onValueChange={(newVal) => {
              setJsonFilters((oldFilters) =>
                oldFilters.map((e) => (e.id === newVal.id ? newVal : e))
              );
            }}
            onDelete={() => {
              setJsonFilters(jsonFilters.filter((e) => e.id !== entry.id));
            }}
          />
        ))}
      </div>
    </>
  );
}

export default Filter;

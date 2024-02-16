"use client";

import { Check, ListFilter } from "lucide-react";
import { ulid } from "ulid";
import { EventFilters } from "../../shared/validation";
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
import { decodeEventFilters, encodeEventFilters } from "../../lib/filters";
import { useRouter } from "next/router";
import { handleError } from "../../lib/handleError";

export function useEventFilters() {
  const router = useRouter();

  const value = decodeEventFilters(
    new URLSearchParams(router.query as Record<string, string>)
  );

  const onChange = (newValue: EventFilters) => {
    const params = encodeEventFilters(newValue);
    router
      .push({
        pathname: router.pathname,
        query: {
          ...Object.fromEntries(params),
        },
      })
      .catch(handleError);
  };

  return { value, onChange };
}

export function EditEventFilters() {
  const router = useRouter();

  const { value, onChange } = useEventFilters();

  const { data: allEventTypes } = api.eventTypes.list.useQuery();
  const { data: allFeatureDefs } = api.features.list.useQuery();

  const { dateRange, eventType, features: featureFilters } = value;

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
                    onChange({
                      ...value,
                      dateRange: newRange,
                    });
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
                onChange({
                  ...value,
                  eventType: type,
                });
              }}
            />

            {/* Feature Filter*/}
            <AddFeatureFilterSubItem
              featureDefs={allFeatureDefs ?? []}
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
        {eventType && (
          <TypeChip
            type={eventType}
            onDelete={() => {
              onChange({
                ...value,
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
              onChange({
                ...value,
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
      </div>
    </>
  );
}

import { format, parse, subWeeks } from "date-fns";
import { Entity } from "event-processing";
import { sumBy } from "lodash";
import { useEffect, useMemo, useState } from "react";
import { type DateRange } from "react-day-picker";
import { ZoomAreaChart } from "~/components/ZoomAreaChart";
import { api } from "../utils/api";
import { DatePickerWithRange } from "./DatePickerWithRange";
import { BarList } from "./charts/BarList";
import { Card } from "./ui/card";
import { EntityFilter, EntityFilterType } from "../shared/validation";

interface Props {
  entity: Entity;
}

export default function EventCharts({ entity }: Props) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subWeeks(new Date(), 2),
    to: new Date(),
  });

  const filters = useMemo(() => {
    const arr: EntityFilter[] = [];
    if (entity) {
      arr.push({
        type: EntityFilterType.EntityId,
        data: entity.id,
      });
      arr.push({
        type: EntityFilterType.EntityType,
        data: entity.type,
      });
    }
    return arr;
  }, [entity]);
  const { data: entityDataRows } = api.lists.getEntitiesList.useQuery(
    { entityFilters: filters },
    { enabled: !!entity }
  );

  const entityData = useMemo(() => entityDataRows?.rows[0], [entityDataRows]);
  const [initializedFirstSeen, setInitializedFirstSeen] = useState(false);
  useEffect(() => {
    if (entityData && !initializedFirstSeen) {
      setDateRange({
        from: entityData.firstSeenAt,
        to: new Date(),
      });
      setInitializedFirstSeen(true);
    }
  }, [entityData, initializedFirstSeen]);

  const { data: eventTypeBins } = api.charts.getEventTypeTimeData.useQuery(
    {
      start: dateRange?.from ?? new Date(),
      end: dateRange?.to ?? new Date(),
      entity,
    },
    { enabled: !!dateRange?.from && !!dateRange?.to }
  );

  const { data: eventTypeCounts, isLoading: eventTypeCountsLoading } =
    api.charts.getEventTypeCounts.useQuery(
      {
        start: dateRange?.from ?? new Date(),
        end: dateRange?.to ?? new Date(),
        entity,
      },
      { enabled: !!dateRange?.from && !!dateRange?.to }
    );

  const eventTypeBarData = useMemo(
    () =>
      eventTypeCounts?.map((type) => ({
        name: type.event_type ?? "No label",
        value: type.count,
      })) ?? [],
    [eventTypeCounts]
  );

  return (
    <>
      <DatePickerWithRange
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />
      <div className="flex mt-2 gap-4">
        <div className="flex-1">
          <Card className="p-4">
            <div className="mb-2">Events</div>

            {eventTypeBinsLoading ? (
              <Loader2Icon className="w-8 h-8 text-muted-foreground animate-spin mx-auto my-20" />
            ) : (
              <ZoomAreaChart
                tooltipOrder="byValue"
                data={
                  eventTypeBins?.bins
                    ? Object.entries(eventTypeBins.bins).map(
                        ([time, labels]) => ({
                          date: format(new Date(time), "MMM d"),
                          time,
                          ...labels,
                        })
                      )
                    : []
                }
                onZoom={(x1, x2) => {
                  const start = parse(x1, "MMM d", new Date());
                  const end = parse(x2, "MMM d", new Date());
                  setDateRange({
                    from: start > end ? end : start,
                    to: start > end ? start : end,
                  });
                }}
                index="date"
                categories={eventTypeBins?.labels ?? []}
                valueFormatter={(value) => {
                  return Intl.NumberFormat("us").format(value).toString();
                }}
              />
            )}
          </Card>
        </div>

        <div className="flex-1">
          <Card className="p-4">
            <div>Total Events</div>
            {eventTypeCountsLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <div className="text-2xl">
                {Intl.NumberFormat("us")
                  .format(sumBy(eventTypeCounts, (type) => type.count))
                  .toString()}
              </div>
            )}
          </Card>
          <Card className="mt-4 p-4">
            <div className="mb-4">Event Types</div>
            {eventTypeCountsLoading ? (
              <Skeleton className="h-8 w-[200px] mt-1" />
            ) : (
              <BarList
                data={eventTypeBarData}
                valueFormatter={(value) => {
                  return Intl.NumberFormat("us").format(value).toString();
                }}
              />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

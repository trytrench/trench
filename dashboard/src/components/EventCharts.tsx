import { format, parse, subWeeks } from "date-fns";
import { Entity } from "event-processing";
import { sumBy } from "lodash";
import { useMemo, useState } from "react";
import { type DateRange } from "react-day-picker";
import { ZoomAreaChart } from "~/components/ZoomAreaChart";
import { api } from "../utils/api";
import { DatePickerWithRange } from "./DatePickerWithRange";
import { BarList } from "./charts/BarList";
import { Card } from "./ui/card";

interface Props {
  entity: Entity;
}

export default function EventCharts({ entity }: Props) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subWeeks(new Date(), 2),
    to: new Date(),
  });

  const { data: eventTypeBins } = api.charts.getEventTypeTimeData.useQuery(
    {
      start: dateRange?.from ?? new Date(),
      end: dateRange?.to ?? new Date(),
      entity,
    },
    { enabled: !!dateRange?.from && !!dateRange?.to }
  );

  const { data: eventTypeCounts } = api.charts.getEventTypeCounts.useQuery(
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
          </Card>
        </div>

        <div className="flex-1">
          <Card className="p-4">
            <div>Total Events</div>
            <div className="text-2xl">
              {Intl.NumberFormat("us")
                .format(sumBy(eventTypeCounts, (type) => type.count))
                .toString()}
            </div>
          </Card>
          <Card className="mt-4 p-4">
            <div className="mb-4">Event Types</div>
            <BarList
              data={eventTypeBarData}
              valueFormatter={(value) => {
                return Intl.NumberFormat("us").format(value).toString();
              }}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
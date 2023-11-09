import { format } from "date-fns";
import { sumBy } from "lodash";
import { useMemo } from "react";
import { ZoomAreaChart } from "~/components/ZoomAreaChart";
import { api } from "../utils/api";
import { DateRange } from "react-day-picker";
import { Panel } from "./ui/custom/panel";
import { BarList } from "./charts/BarList";
import { Separator } from "./ui/separator";

interface Props {
  entityId?: string;
  datasetId: string;
  dateRange: DateRange;
}

export default function EventsDashboard({
  entityId,
  datasetId,
  dateRange,
}: Props) {
  const { data: eventTypeBins } = api.events.getEventTypeTimeData.useQuery(
    { start: dateRange.from!, end: dateRange.to!, entityId, datasetId },
    { enabled: !!dateRange.from && !!dateRange.to && !!datasetId }
  );

  const { data: eventTypeDists } =
    api.events.getEventTypeDistributions.useQuery(
      { start: dateRange.from!, end: dateRange.to!, entityId, datasetId },
      { enabled: !!dateRange.from && !!dateRange.to && !!datasetId }
    );

  const { data: eventLabelDists } =
    api.events.getEventLabelDistributions.useQuery(
      { start: dateRange.from!, end: dateRange.to!, entityId, datasetId },
      { enabled: !!dateRange.from && !!dateRange.to && !!datasetId }
    );

  const { data: eventLabelTimeData } =
    api.events.getEventLabelTimeData.useQuery(
      { start: dateRange.from!, end: dateRange.to!, entityId, datasetId },
      { enabled: !!dateRange.from && !!dateRange.to && !!datasetId }
    );

  const eventTypeBarData = useMemo(
    () =>
      eventTypeDists?.map((type) => ({
        name: type.event_type ?? "No label",
        value: type.count,
      })) ?? [],
    [eventTypeDists]
  );

  return (
    <>
      <div className="pt-8 flex gap-8">
        <div className="flex-1">
          <Panel>
            <div className="mb-2">Events</div>
            <ZoomAreaChart
              stack={true}
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
              onZoom={() => {}}
              index="date"
              categories={eventTypeBins?.labels}
              valueFormatter={(value) => {
                return Intl.NumberFormat("us").format(value).toString();
              }}
            />
          </Panel>
        </div>

        <div className="flex-1">
          <Panel>
            <div>Total Events</div>
            <div>
              {Intl.NumberFormat("us")
                .format(sumBy(eventTypeDists, (type) => type.count))
                .toString()}
            </div>
          </Panel>
          <Panel className="mt-4">
            <div className="mb-4">Event types</div>
            <BarList
              data={eventTypeBarData}
              valueFormatter={(value) => {
                return Intl.NumberFormat("us").format(value).toString();
              }}
            />
          </Panel>
        </div>
      </div>

      <Separator />

      {eventLabelTimeData &&
        Object.keys(eventLabelTimeData.bins).map((eventType) => (
          <div key={eventType} className="mb-8">
            <div className="mb-4">{eventType}</div>
            <div className="flex gap-8">
              <div className="flex-1">
                <Panel>
                  <div className="mb-4">Labels</div>
                  <ZoomAreaChart
                    data={Object.entries(
                      eventLabelTimeData.bins[eventType]
                    ).map(([time, labels]) => ({
                      date: format(new Date(time), "MMM d"),
                      time,
                      ...labels,
                    }))}
                    onZoom={() => {}}
                    index="date"
                    categories={eventLabelTimeData.labels[eventType]}
                    valueFormatter={(value) => {
                      return Intl.NumberFormat("us").format(value).toString();
                    }}
                  />
                </Panel>
              </div>
              <div className="flex-1">
                <Panel>
                  <div>Events</div>
                  <div>
                    {Intl.NumberFormat("us")
                      .format(
                        eventTypeDists?.find(
                          (type) => type.event_type === eventType
                        )?.count ?? 0
                      )
                      .toString()}
                  </div>
                </Panel>
                <Panel className="mt-4 max-h-80 overflow-auto">
                  <div className="mb-4">Labels</div>
                  <BarList
                    data={eventLabelDists
                      .filter((d) => d.event_type === eventType)
                      .map((label) => ({
                        name: label.label ?? "No label",
                        value: label.count,
                      }))}
                    valueFormatter={(value) => {
                      return Intl.NumberFormat("us").format(value).toString();
                    }}
                  />
                </Panel>
              </div>
            </div>
          </div>
        ))}
    </>
  );
}

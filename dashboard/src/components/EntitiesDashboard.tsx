import { format } from "date-fns";
import { sumBy } from "lodash";
import { useMemo } from "react";
import { ZoomAreaChart } from "~/components/ZoomAreaChart";
import { api } from "../utils/api";
import { DateRange } from "react-day-picker";
import { BarList } from "./charts/BarList";
import { Panel } from "./ui/custom/panel";
import { Separator } from "./ui/separator";

interface Props {
  dateRange: DateRange;
}

export default function EntitiesDashboard({ dateRange }: Props) {
  const { data: entityTypeTimeData } =
    api.events.getEntityTypeTimeData.useQuery(
      { start: dateRange.from!, end: dateRange.to! },
      { enabled: !!dateRange.from && !!dateRange.to }
    );

  const { data: entityTypeDists } =
    api.events.getEntityTypeDistributions.useQuery(
      { start: dateRange.from!, end: dateRange.to! },
      { enabled: !!dateRange.from && !!dateRange.to }
    );

  const { data: entityLabelDists } =
    api.events.getEntityLabelDistributions.useQuery(
      { start: dateRange.from!, end: dateRange.to! },
      { enabled: !!dateRange.from && !!dateRange.to }
    );

  const { data: entityLabelTimeData } =
    api.events.getEntityLabelTimeData.useQuery(
      { start: dateRange.from!, end: dateRange.to! },
      { enabled: !!dateRange.from && !!dateRange.to }
    );

  const entityTypeBarData = useMemo(
    () =>
      entityTypeDists?.map((type) => ({
        name: type.entity_type ?? "No label",
        value: type.count,
      })) ?? [],
    [entityTypeDists]
  );

  return (
    <>
      <div className="pt-8 flex gap-8">
        <div className="flex-1">
          <Panel>
            <div className="mb-2">Entities</div>
            <ZoomAreaChart
              stack={true}
              data={
                entityTypeTimeData?.bins
                  ? Object.entries(entityTypeTimeData.bins).map(
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
              categories={entityTypeTimeData?.labels}
              valueFormatter={(value) => {
                return Intl.NumberFormat("us").format(value).toString();
              }}
            />
          </Panel>
        </div>

        <div className="flex-1">
          <Panel>
            <h1 className="">Total Entities</h1>
            <div>
              {Intl.NumberFormat("us")
                .format(sumBy(entityTypeDists, (type) => Number(type.count)))
                .toString()}
            </div>
          </Panel>
          <Panel className="mt-4">
            <div className="mb-4">Entity types</div>
            <BarList
              data={entityTypeBarData}
              valueFormatter={(value) => {
                return Intl.NumberFormat("us").format(value).toString();
              }}
            />
          </Panel>
        </div>
      </div>

      <Separator />

      {entityLabelTimeData &&
        Object.keys(entityLabelTimeData.bins).map((entityType) => (
          <div key={entityType} className="mb-8">
            <div className="mb-4">{entityType}</div>
            <div className="flex gap-8">
              <div className="flex-1">
                <Panel>
                  <div className="mb-4">Labels</div>
                  <ZoomAreaChart
                    data={Object.entries(
                      entityLabelTimeData.bins[entityType]
                    ).map(([time, labels]) => ({
                      date: format(new Date(time), "MMM d"),
                      time,
                      ...labels,
                    }))}
                    onZoom={() => {}}
                    index="date"
                    categories={entityLabelTimeData.labels[entityType]}
                    valueFormatter={(value) => {
                      return Intl.NumberFormat("us").format(value).toString();
                    }}
                  />
                </Panel>
              </div>
              <div className="flex-1 flex-col">
                <Panel>
                  <div>Entities</div>
                  <div>
                    {Intl.NumberFormat("us").format(
                      entityTypeDists.find(
                        (type) => type.entity_type === entityType
                      ).count
                    )}
                  </div>
                </Panel>
                <Panel className="mt-4 max-h-80 overflow-auto">
                  <div className="mb-4">Labels</div>
                  <BarList
                    data={entityLabelDists
                      .filter((d) => d.entity_type === entityType)
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

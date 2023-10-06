import { BarList, Card, Divider, Metric, Text, Title } from "@tremor/react";
import { format } from "date-fns";
import { sumBy } from "lodash";
import { useMemo } from "react";
import { DateParam, useQueryParams } from "use-query-params";
import { ZoomAreaChart } from "~/components/ZoomAreaChart";
import { api } from "../utils/api";

export default function EntitiesDashboard() {
  const [dateRange, setDateRange] = useQueryParams({
    from: DateParam,
    to: DateParam,
  });

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
          <Card>
            <Title className="mb-2">Entities</Title>
            <ZoomAreaChart
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
          </Card>
        </div>

        <div className="flex-1">
          <Card>
            <Text>Total Entities</Text>
            <Metric>
              {Intl.NumberFormat("us")
                .format(sumBy(entityTypeDists, (type) => Number(type.count)))
                .toString()}
            </Metric>
          </Card>
          <Card className="mt-4">
            <Title className="mb-4">Entity types</Title>
            <BarList
              data={entityTypeBarData}
              valueFormatter={(value) => {
                return Intl.NumberFormat("us").format(value).toString();
              }}
            />
          </Card>
        </div>
      </div>

      <Divider />

      {entityLabelTimeData &&
        Object.keys(entityLabelTimeData.bins).map((entityType) => (
          <div key={entityType} className="mb-8">
            <Title className="mb-4">{entityType}</Title>
            <div className="flex gap-8">
              <div className="flex-1">
                <Card>
                  <Title className="mb-4">Labels</Title>
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
                </Card>
              </div>
              <div className="flex-1 flex-col">
                <Card>
                  <Text>Entities</Text>
                  <Metric>
                    {Intl.NumberFormat("us").format(
                      entityTypeDists.find(
                        (type) => type.entity_type === entityType
                      ).count
                    )}
                  </Metric>
                </Card>
                <Card className="mt-4 max-h-80 overflow-auto">
                  <Title className="mb-4">Labels</Title>
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
                </Card>
              </div>
            </div>
          </div>
        ))}
    </>
  );
}

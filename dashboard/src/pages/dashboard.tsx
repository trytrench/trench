import { format } from "date-fns";
import { type RouterOutputs, api } from "../utils/api";
import {
  DEFAULT_DATE_RANGE,
  DateRangePicker,
  EventTypeFilter,
  IntervalPicker,
  useEventFilters,
  useTimeInterval,
} from "../components/Filters";
import { Navbar } from "../components/Navbar";
import { TopList } from "../components/TopList";
import {
  ArrayParam,
  NumberParam,
  StringParam,
  useQueryParam,
} from "use-query-params";
import { EntityTimeChart } from "../components/EntityTimeChart";
import { EntityLabelDistribution } from "../components/EntityLabelDistribution";
import {
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BarList,
  Button,
  Callout,
  Card,
  Divider,
  Metric,
  Text,
  Title,
} from "@tremor/react";
import { AreaChart } from "@trytrench/tremor";
import { ReferenceArea, ReferenceLine } from "recharts";
import { type CategoricalChartState } from "recharts/types/chart/generateCategoricalChart";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from "../components/base/ContextMenu";
import {
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/react";
import { LoadingPlaceholder } from "../components/LoadingPlaceholder";
import clsx from "clsx";

function formatTimeRange([start, end]: [number, number], interval: number) {
  if (interval >= 1000 * 60 * 60 * 24) {
    return `${format(new Date(start), "MMM d")} – ${format(
      new Date(end),
      "MMM d"
    )}`;
  } else if (interval >= 1000 * 60 * 60 * 1) {
    return `${format(new Date(start), "MMM d, h a")} – ${format(
      new Date(end),
      "MMM d, h a"
    )}`;
  } else {
    return `${format(new Date(start), "MMM d, h:mm a")} – ${format(
      new Date(end),
      "MMM d, h:mm a"
    )}`;
  }
}

function formatPercentage(value: number, maxValue: number) {
  if (maxValue < 0.01) {
    return `${value.toFixed(4)}%`;
  }
  if (maxValue < 0.1) {
    return `${value.toFixed(3)}%`;
  }
  if (maxValue < 1) {
    return `${value.toFixed(2)}%`;
  }
  if (maxValue < 10) {
    return `${value.toFixed(1)}%`;
  }
  return `${value.toFixed(0)}%`;
}

const DATE_FORMAT_X_AXIS = "MMM d, h:mm a";
function EntitiesPage() {
  const { data: entityLabels } = api.labels.getEntityLabels.useQuery();
  const { data: entityTypes } = api.labels.getEntityTypes.useQuery();

  const [entityType] = useQueryParam("entityType", StringParam);
  const eventFilters = useEventFilters();
  const [paramEntityLabels] = useQueryParam("entityLabel", ArrayParam);

  const sortedEntityTypes = useMemo(() => {
    if (!entityTypes) {
      return [];
    }
    return entityTypes.sort((a, b) => {
      // make sure User is first
      if (a.name === "User") {
        return -1;
      }
      if (b.name === "User") {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [entityTypes]);

  return (
    <div className="p-8 flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Text>Search across</Text>
        <EventTypeFilter />
      </div>
      {sortedEntityTypes?.map((entityType, idx) => {
        return (
          <div key={idx}>
            <Title>Entity: {entityType.name}</Title>
            <div className="h-4"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-4">
                <EntityLabelDistribution
                  title={`Labels of ${
                    entityType ? `${entityType.name} ` : ""
                  }Entities`}
                  entityFilters={{
                    entityType: entityType.id,
                  }}
                />
                <TopList
                  title={`${
                    entityType ? `${entityType.name} ` : ""
                  } Entities with the most ${
                    eventFilters.eventType
                      ? `\`${eventFilters.eventType}\` `
                      : ""
                  }Events`}
                  entityTitle={entityType.name ?? ""}
                  countTitle={"Events"}
                  args={{
                    limit: 5,
                    entityFilters: {
                      entityType: entityType.id,
                    },
                  }}
                />
              </div>
              <div className="col-span-2">
                {!paramEntityLabels?.length && (
                  <EntityTimeChart
                    title={`Unique ${
                      entityType ? `${entityType.name} ` : ""
                    }Entities Seen`}
                    color="neutral"
                    entityFilters={{
                      entityType: entityType.id,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type Chart =
  RouterOutputs["dashboard"]["getTimeBuckets"]["anomalyCharts"][number];

function AnomalyChart(props: {
  chart: Chart;
  selectedTimeRange: [number, number] | undefined;
  onSelectedTimeRangeChange: (dateRange: [number, number] | undefined) => void;
  onOpenTimeRangeContextMenu?: MouseEventHandler;
  onSelectingChange?: (selecting: boolean) => void;
  chartClassName?: string;
}) {
  const {
    chart,
    selectedTimeRange,
    onSelectedTimeRangeChange,
    onOpenTimeRangeContextMenu,
    onSelectingChange,
    chartClassName,
  } = props;

  const [dragging, _setDragging] = useState<boolean>(false);
  const [firstX, setFirstX] = useState<string | undefined>(undefined);
  const [firstTime, setFirstTime] = useState<number | undefined>(undefined);
  const [secondX, setSecondX] = useState<string | undefined>(undefined);

  const setDragging = useCallback(
    (dragging: boolean) => {
      if (onSelectingChange) {
        onSelectingChange(dragging);
      }
      _setDragging(dragging);
    },
    [onSelectingChange, _setDragging]
  );

  useEffect(() => {
    if (!dragging) {
      setFirstX(undefined);
      setSecondX(undefined);
    }
  }, [dragging, setFirstX, setSecondX]);
  const handleMouseDown = useCallback(
    (e: CategoricalChartState) => {
      if (!e) return;
      setFirstX(e.activeLabel);
      const firstTime = e.activePayload?.[0]?.payload.time;
      setFirstTime(firstTime);
      setSecondX(undefined);
      onSelectedTimeRangeChange(undefined);
      setDragging(true);
    },
    [onSelectedTimeRangeChange, setDragging]
  );

  const handleMouseMove = useCallback(
    (e: CategoricalChartState) => {
      if (!e) return;
      if (!dragging) return;
      setSecondX(e.activeLabel);
    },
    [dragging]
  );

  const handleMouseUp = useCallback(
    (e: CategoricalChartState) => {
      if (!e) return;
      if (!dragging) return;
      setSecondX(e.activeLabel);
      setDragging(false);
      const secondTime = e.activePayload?.[0]?.payload.time;

      if (firstTime && secondTime) {
        if (firstTime > secondTime) {
          onSelectedTimeRangeChange([secondTime, firstTime]);
        } else if (firstTime < secondTime) {
          onSelectedTimeRangeChange([firstTime, secondTime]);
        }
      }
    },
    [dragging, firstTime, onSelectedTimeRangeChange, setDragging]
  );

  let refLineY: number | undefined = undefined;
  let singleLine: Chart["lines"][number] | null = null;
  if (chart.lines.length === 1) {
    const avg = chart.lines[0]!.avg;
    const stdDev = chart.lines[0]!.stdDev;
    refLineY = avg + 3 * stdDev;
    singleLine = chart.lines[0]!;
  }
  const hideRefLine =
    chart.lines.length !== 1 ||
    !refLineY ||
    (chart.type === "percent" && refLineY > 1);
  const maxValue = Math.max(
    ...chart.lines.flatMap((line) => line.data.map((item) => item.value))
  );
  const maxY = Math.max(hideRefLine ? 0 : refLineY ?? 0, maxValue);

  const areaChartData = useMemo(() => {
    if (chart.lines.length === 0) {
      return [];
    }
    const result: any[] = [];
    const line = chart.lines[0]!;
    for (let i = 0; i < line.data.length; i++) {
      const item = line.data[i]!;
      const resultItem: any = {
        date: format(new Date(item.bucket), DATE_FORMAT_X_AXIS),
        time: item.bucket,
      };

      for (const otherLine of chart.lines) {
        resultItem[otherLine.label] = otherLine.data[i]!.value;
      }

      result.push(resultItem);
    }

    return result;
  }, [chart.lines]);

  const triggerRef = useRef<HTMLDivElement>(null);
  const handleContextMenu: MouseEventHandler = useCallback((e) => {
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: e.clientX,
      clientY: e.clientY,
    });

    triggerRef.current?.dispatchEvent(event);
  }, []);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const timeInterval = useTimeInterval();

  return (
    <div>
      {singleLine ? (
        <div className="flex items-center mb-4">
          <Text className="font-medium">{singleLine.label}</Text>
          {selectedTimeRange && singleLine.metadata?.entityType ? (
            <Button
              variant="light"
              className="ml-4"
              onClick={() => {
                setModalOpen(true);
              }}
            >
              See from {formatTimeRange(selectedTimeRange, timeInterval)}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className={chartClassName}>
        <AreaChart
          startEndOnly
          yAxisWidth={40}
          onMouseDownChart={handleMouseDown}
          onMouseMoveChart={handleMouseMove}
          onMouseUpChart={handleMouseUp}
          onMouseDownCapture={(e) => {
            if (e.button === 2) {
              e.stopPropagation();
            }
          }}
          onMouseUpCapture={(e) => {
            if (e.button === 2) {
              e.stopPropagation();
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleContextMenu(e);
            onOpenTimeRangeContextMenu?.(e);
          }}
          valueFormatter={(value) => {
            return chart.type === "count"
              ? value.toString()
              : formatPercentage(value, maxY);
          }}
          showLegend={!singleLine}
          showGridLines={false}
          maxValue={maxY}
          className="h-full select-none"
          data={areaChartData}
          index="date"
          categories={chart.lines.map((line) => line.label)}
          colors={chart.lines.map((line) => line.color || "gray")}
          tooltipOrder="byValue"
        >
          <ReferenceLine y={refLineY} stroke="black" strokeDasharray="3 3" />
          <ReferenceArea
            visibility={firstX && secondX ? "visible" : "hidden"}
            x1={firstX}
            x2={secondX}
            fill="gray"
            fillOpacity={0.4}
          />

          <ReferenceArea
            z={10}
            visibility={!!selectedTimeRange ? "visible" : "hidden"}
            x1={
              selectedTimeRange
                ? format(new Date(selectedTimeRange[0]!), DATE_FORMAT_X_AXIS)
                : undefined
            }
            x2={
              selectedTimeRange
                ? format(new Date(selectedTimeRange[1]!), DATE_FORMAT_X_AXIS)
                : undefined
            }
            fill="gray"
            fillOpacity={0.2}
          ></ReferenceArea>

          {/* {chart.lines.length === 1 &&
        chart.lines[0]!.anomalyRanges.map((anomalyRange, idx) => {
          return (
            <ReferenceArea
              key={idx}
              x1={format(new Date(anomalyRange.startTime), "MMM d")}
              x2={format(new Date(anomalyRange.endTime), "MMM d")}
              fill="red"
              fillOpacity={0.5}
            />
          );
        })} */}
        </AreaChart>
        {selectedTimeRange &&
        singleLine &&
        singleLine.metadata?.entityType &&
        singleLine.metadata?.entityLabel ? (
          <EntitiesWithLabelModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            entityType={singleLine.metadata?.entityType as string}
            entityLabel={singleLine.metadata?.entityLabel as string}
            timeRange={selectedTimeRange ?? [0, 0]}
          />
        ) : null}

        {/* <ContextMenu>
          <ContextMenuTrigger ref={triggerRef} />
          <ContextMenuContent>
            <ContextMenuItem
              onClick={() => {
                setModalOpen(true);
              }}
            >
              See more
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu> */}
      </div>
    </div>
  );
}

interface EntitiesWithLabelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: string;
  entityLabel?: string;
  timeRange: [number, number];
}
function EntitiesWithLabelModal(props: EntitiesWithLabelModalProps) {
  const { open, onOpenChange, entityType, entityLabel, timeRange } = props;

  const timeInterval = useTimeInterval();
  const eventFilters = useEventFilters();
  const { data: entityLabelsData } = api.labels.getEntityLabels.useQuery();
  const entityLabelData = useMemo(() => {
    if (!entityLabel || !entityLabelsData) {
      return undefined;
    }
    return entityLabelsData.find((item) => item.id === entityLabel);
  }, [entityLabel, entityLabelsData]);

  const { data, isLoading } =
    api.dashboard.getTopEntitiesOfTypeAndLabel.useQuery(
      {
        type: entityType,
        label: entityLabel,
        eventFilters,
        startTime: timeRange[0],
        endTime: timeRange[1],
        limit: 20,
      },
      {
        enabled: open,
      }
    );

  return (
    <div>
      <Modal
        isOpen={open}
        onClose={() => {
          onOpenChange(false);
        }}
      >
        <ModalOverlay />
        <ModalContent maxW="56rem">
          <ModalHeader>
            <Title>
              {formatTimeRange(timeRange, timeInterval)}: `{entityType}` with
              label `{entityLabelData?.name}`
            </Title>
            <ModalCloseButton />
          </ModalHeader>
          <div className="p-8 pt-0">
            <div className="grid gap-4 grid-cols-1">
              <Card>
                <Title>Most frequent `{entityType}`</Title>
                <Text>with label `{entityLabelData?.name}`</Text>
                <div className="h-4"></div>
                {isLoading ? (
                  <LoadingPlaceholder />
                ) : data && data.topEntities.data.length === 0 ? (
                  <Text>No data</Text>
                ) : (
                  <BarList
                    data={
                      data?.topEntities.data.slice(0, 5).map((item) => {
                        const { average, stdDev } = data.topEntities;
                        const isAnomaly = item.count > average + 3 * stdDev;
                        return {
                          name: isAnomaly ? (
                            <b>{item.entityName}</b>
                          ) : (
                            item.entityName
                          ),
                          value: item.count,
                          color: isAnomaly ? "red" : "blue",
                          href: `/entity/${item.entityId}`,
                        };
                      }) ?? []
                    }
                    placeholder="No entities found"
                  />
                )}
              </Card>

              <Card className="">
                <Title>Top related entities</Title>
                <Text>
                  frequently seen with `{entityType}` with label `
                  {entityLabelData?.name}`
                </Text>
                <div className="h-4"></div>
                {isLoading ? (
                  <LoadingPlaceholder />
                ) : data && data.topRelatedEntities.data.length === 0 ? (
                  <Text>No data</Text>
                ) : (
                  <BarList
                    data={
                      data?.topRelatedEntities.data.slice(0, 5).map((item) => {
                        const { average, stdDev } = data.topRelatedEntities;
                        const isAnomaly = item.count > average + 3 * stdDev;
                        const displayName = `${item.entityType}: \`${item.entityName}\` as \`${item.linkType}\` via \`${item.eventType}\``;
                        return {
                          name: isAnomaly ? <b>{displayName}</b> : displayName,
                          value: item.count,
                          color: isAnomaly ? "red" : "blue",
                          href: `/entity/${item.entityId}`,
                        };
                      }) ?? []
                    }
                  />
                )}
              </Card>

              <Card>
                <Title>Most common features</Title>
                <Text>
                  among `{entityType}` with label `{entityLabelData?.name}`
                </Text>
                <div className="h-4"></div>
                {isLoading ? (
                  <LoadingPlaceholder />
                ) : data && data.topFeatures.data.length === 0 ? (
                  <Text>No data</Text>
                ) : (
                  <BarList
                    data={
                      data?.topFeatures.data.slice(0, 5).map((item) => {
                        const { average, stdDev } = data.topFeatures;
                        const isAnomaly = item.count > average + 3 * stdDev;
                        const displayName = `${item.featureName}: ${item.featureValue}`;
                        return {
                          name: isAnomaly ? <b>{displayName}</b> : displayName,
                          value: item.count,
                          color: isAnomaly ? "red" : "blue",
                          href: `/search`,
                        };
                      }) ?? []
                    }
                  />
                )}
              </Card>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}

function renderEventName(eventType: string | null, capitalize = false) {
  if (capitalize) {
    if (!eventType) {
      return "Events";
    } else {
      return `\`${eventType}\` Events`;
    }
  } else {
    if (!eventType) {
      return "events";
    } else {
      return `\`${eventType}\` events`;
    }
  }
}

interface InvestigateDateRangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeRange: [number, number];
}
function InvestigateDateRangeModal(props: InvestigateDateRangeModalProps) {
  const { timeRange, open, onOpenChange } = props;

  const eventFilters = useEventFilters();
  const { data } = api.dashboard.getTopEntities.useQuery(
    {
      startTime: timeRange[0],
      endTime: timeRange[1],
      limit: 20,
      eventFilters,
    },
    {
      enabled: !!timeRange && open,
    }
  );

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        onOpenChange(false);
      }}
    >
      <ModalOverlay />
      <ModalContent maxW="60rem">
        <div className="p-8">
          <Title>
            Entities with most {renderEventName(eventFilters.eventType)} (
            {format(new Date(timeRange[0]), "MMMM d")} –{" "}
            {format(new Date(timeRange[1]), "MMMM d")})
          </Title>
          <div className="h-8"></div>
          <div className="grid gap-4 grid-cols-2">
            {data?.map((topList, idx) => (
              <Card key={idx}>
                <Title>{topList.typeName}</Title>
                <div className="h-2"></div>
                <BarList
                  data={topList.entities
                    .map((item) => {
                      const threeSigmas = topList.average + 3 * topList.stdDev;
                      const isAnomaly = item.count > threeSigmas;
                      return {
                        name: isAnomaly ? <b>{item.name}</b> : item.name,
                        value: item.count,
                        color: isAnomaly ? "red" : "blue",
                      };
                    })
                    .slice(0, 3)}
                  valueFormatter={(value) => value.toString()}
                />
              </Card>
            ))}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}

function EventsPage() {
  const eventFilters = useEventFilters();

  const timeInterval = useTimeInterval();

  const { data } = api.dashboard.getTimeBuckets.useQuery(
    {
      interval: timeInterval,
      start: eventFilters?.dateRange?.from ?? DEFAULT_DATE_RANGE.from.getTime(),
      end: eventFilters?.dateRange?.to ?? DEFAULT_DATE_RANGE.to.getTime(),
      eventFilters,
    },
    {
      enabled: !!eventFilters?.dateRange,
    }
  );
  // const { data: eventTypes } = api.labels.getEventTypes.useQuery();

  const [timeRange, setTimeRange] = useState<[number, number] | undefined>(
    undefined
  );
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  const [selecting, setSelecting] = useState<boolean>(false);

  const eventCountsInTimeRange = useMemo(() => {
    if (!data?.eventChart || !timeRange) {
      return undefined;
    }
    const lineData = data.eventChart.lines[0]?.data ?? [];
    const startIdx = lineData.findIndex((item) => item.bucket === timeRange[0]);
    const endIdx = lineData.findIndex((item) => item.bucket === timeRange[1]);
    if (startIdx === -1 || endIdx === -1) {
      return undefined;
    }

    const totalLine = data.eventChart.lines.find(
      (line) => line.metadata?.isTotal
    );

    if (!totalLine) {
      return undefined;
    }
    const timeRangeTotalCount = totalLine.data
      .slice(startIdx, endIdx + 1)
      .reduce((acc, item) => acc + item.value, 0);
    const totalCount = totalLine.data.reduce(
      (acc, item) => acc + item.value,
      0
    );

    const percentages = data?.eventChart.lines
      .filter((line) => !line.metadata?.isTotal)
      .map((line) => {
        const timeRange = line.data.slice(startIdx, endIdx + 1);
        const timeRangeLabelCount = timeRange.reduce(
          (acc, item) => acc + item.value,
          0
        );
        const labelCount = line.data.reduce((acc, item) => acc + item.value, 0);

        const timeRangePercentage =
          labelCount === 0
            ? 0
            : (timeRangeLabelCount / timeRangeTotalCount) * 100;
        const allTimePercentage =
          labelCount === 0 ? 0 : (labelCount / totalCount) * 100;

        const ratio = timeRangePercentage / allTimePercentage;

        return {
          label: `\`${line.label}\` rate`,
          value: timeRangePercentage,
          color: line.color,
          metric: formatPercentage(timeRangePercentage, timeRangePercentage),
          ratio: ratio,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    return [
      {
        label: `${
          eventFilters.eventType ? `\`${eventFilters.eventType}\` ` : "#"
        } events`,
        value: timeRangeTotalCount,
        color: totalLine?.color,
        metric: timeRangeTotalCount?.toString(),
        ratio: null,
      },
      ...percentages,
    ];
  }, [data?.eventChart, eventFilters.eventType, timeRange]);
  return (
    <div>
      <div className="px-8 flex items-center gap-4 py-4">
        <Title>Viewing</Title>
        <EventTypeFilter />
        <Title className="whitespace-nowrap">from</Title>
        <DateRangePicker />
        <Title className="whitespace-nowrap">in intervals of</Title>
        <IntervalPicker />
      </div>
      <div className="h-4"></div>
      <div className="p-8 pb-0 grid grid-cols-2 gap-8">
        <div className="h-96">
          {data?.eventChart ? (
            <div className="flex flex-col justify-between">
              <Metric>
                {`${
                  eventFilters.eventType
                    ? `\`${eventFilters.eventType}\` events`
                    : "Events"
                }`}
              </Metric>

              <div className="h-8"></div>
              <AnomalyChart
                chartClassName="h-72"
                chart={data.eventChart}
                selectedTimeRange={timeRange}
                onSelectedTimeRangeChange={setTimeRange}
                onSelectingChange={setSelecting}
              />
            </div>
          ) : (
            <LoadingPlaceholder />
          )}
        </div>

        <div>
          <Metric>
            <span className="">Highlighted: </span>
            <span>
              {timeRange ? (
                <b>{formatTimeRange(timeRange, timeInterval)}</b>
              ) : selecting ? (
                <b>...</b>
              ) : (
                <b>None</b>
              )}
            </span>
          </Metric>

          <div className="h-8"></div>

          {timeRange ? (
            <div>
              <div className="grid grid-cols-2 gap-4">
                {eventCountsInTimeRange?.map((item, idx) => (
                  <Card
                    key={idx}
                    decorationColor={item.color}
                    decoration="top"
                    // className="p-4"
                  >
                    <Text>{item.label}</Text>
                    <div className="flex items-baseline justify-between gap-4">
                      <Metric>{item.metric}</Metric>
                      {item.ratio && (item.ratio > 1.5 || item.ratio < 0.6) ? (
                        <Text className="mt-2 font-medium">
                          {item.ratio > 1
                            ? `${formatPercentage(
                                100 * (item.ratio - 1),
                                100 * (item.ratio - 1)
                              )} above average`
                            : `${formatPercentage(
                                100 * (1 - item.ratio),
                                100 * (1 - item.ratio)
                              )} below average`}
                        </Text>
                      ) : (
                        <></>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
              <div className="h-4"></div>
              <div className="flex gap-4 items-center">
                <Button variant="light">View Event List</Button>
                <Button
                  variant="light"
                  onClick={() => {
                    setModalOpen(true);
                  }}
                >
                  View Top Entities
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-start">
              <Callout title="Highlight a time range" color="yellow">
                Click and drag on any chart to highlight a time range.
              </Callout>
            </div>
          )}
        </div>
      </div>
      <Divider />
      <div className="p-8 grid grid-cols-2 gap-8">
        {data?.anomalyCharts?.map((chart, idx) => {
          const maxY = Math.max(
            ...chart.lines.flatMap((line) =>
              line.data.map((item) => item.value)
            )
          );
          if (maxY < 0.1) {
            return null;
          }
          return (
            <AnomalyChart
              chartClassName="h-32"
              key={idx}
              chart={chart}
              selectedTimeRange={timeRange}
              onSelectedTimeRangeChange={setTimeRange}
              onSelectingChange={setSelecting}
            />
          );
        }) ?? <LoadingPlaceholder />}
      </div>

      {timeRange && (
        <InvestigateDateRangeModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          timeRange={timeRange}
        />
      )}
    </div>
  );
}
export default function Dashboard() {
  const filters = useEventFilters();

  return (
    <div>
      <Navbar />

      <EventsPage />
    </div>
  );
}

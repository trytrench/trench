import { format } from "date-fns";
import { type RouterOutputs, api } from "../utils/api";
import {
  DateRangePicker,
  EventTypeFilter,
  useEventFilters,
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
  Button,
  Card,
  Icon,
  List,
  ListItem,
  Metric,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  Text,
  Title,
} from "@tremor/react";
import { AreaChart } from "@tremor/custom-react";
import { Line, ReferenceArea, ReferenceLine } from "recharts";
import { type CategoricalChartState } from "recharts/types/chart/generateCategoricalChart";
import { AppRouter } from "../server/api/root";
import { twMerge } from "tailwind-merge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from "../components/base/ContextMenu";
import { Modal, ModalContent, ModalOverlay } from "@chakra-ui/react";
import { Calendar, Clock } from "lucide-react";

function formatPercentage(value: number, maxValue: number) {
  if (maxValue < 10) {
    return `${value.toFixed(1)}%`;
  }
  return `${value.toFixed(0)}%`;
}

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
}) {
  const {
    chart,
    selectedTimeRange,
    onSelectedTimeRangeChange,
    onOpenTimeRangeContextMenu,
    onSelectingChange,
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
  if (chart.lines.length === 1) {
    const avg = chart.lines[0]!.avg;
    const stdDev = chart.lines[0]!.stdDev;
    refLineY = avg + 3 * stdDev;
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
        date: format(new Date(item.bucket), "MMM d"),
        time: item.bucket,
      };

      for (const otherLine of chart.lines) {
        resultItem[otherLine.label] = otherLine.data[i]!.value;
      }

      result.push(resultItem);
    }

    return result;
  }, [chart.lines]);

  return (
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
        onOpenTimeRangeContextMenu?.(e);
      }}
      valueFormatter={(value) => {
        return chart.type === "count"
          ? value.toString()
          : formatPercentage(value, maxY);
      }}
      showGridLines={false}
      maxValue={maxY}
      className="h-full select-none"
      data={areaChartData}
      index="date"
      categories={chart.lines.map((line) => line.label)}
      colors={chart.lines.map((line) => line.color)}
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
            ? format(new Date(selectedTimeRange[0]!), "MMM d")
            : undefined
        }
        x2={
          selectedTimeRange
            ? format(new Date(selectedTimeRange[1]!), "MMM d")
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
  );
}

interface InvestigateDateRangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeRange: [number, number];
}
function InvestigateDateRangeModal(props: InvestigateDateRangeModalProps) {
  const { timeRange, open, onOpenChange } = props;

  const { data } = api.dashboard.getTopEntities.useQuery(
    {
      startTime: timeRange[0],
      endTime: timeRange[1],
      limit: 5,
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
      <ModalContent>
        {data?.map((topList, idx) => (
          <Card key={idx}>
            <Title>{topList.type}</Title>
            <List>
              {topList.entities.map((item, idx) => (
                <ListItem key={idx}>
                  <span>{item.name}</span>
                  <span>{item.count}</span>
                </ListItem>
              ))}
            </List>
          </Card>
        ))}
      </ModalContent>
    </Modal>
  );
}

function EventsPage() {
  const eventFilters = useEventFilters();

  const { data } = api.dashboard.getTimeBuckets.useQuery({
    interval: 1000 * 60 * 60 * 24,
    start: eventFilters.dateRange?.start ?? 0,
    end: eventFilters.dateRange?.end ?? 0,
    eventFilters,
  });
  // const { data: eventTypes } = api.labels.getEventTypes.useQuery();

  const [timeRange, setTimeRange] = useState<[number, number] | undefined>(
    undefined
  );
  const [modalOpen, setModalOpen] = useState<boolean>(false);

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
      .sort((a, b) => b.value - a.value);

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
  }, [data.eventChart, eventFilters.eventType, timeRange]);
  return (
    <div>
      <div className="px-8 flex items-center gap-4">
        <Title>Viewing</Title>
        <EventTypeFilter />
        <Title>events from</Title>
        <div style={{ width: 1000 }}>
          <DateRangePicker />
        </div>
      </div>
      <div className="h-4"></div>
      <div className="p-8 grid grid-cols-2 gap-12 bg-gray-50">
        {data?.eventChart && (
          <div className="h-56">
            <div className="items-center flex">
              <Title>
                {`${
                  eventFilters.eventType
                    ? `\`${eventFilters.eventType}\` events`
                    : "Events"
                } over time`}
              </Title>
            </div>
            <div className="h-4"></div>
            <AnomalyChart
              chart={data.eventChart}
              selectedTimeRange={timeRange}
              onSelectedTimeRangeChange={setTimeRange}
              onOpenTimeRangeContextMenu={handleContextMenu}
              onSelectingChange={setSelecting}
            />
          </div>
        )}
        <div>
          <div className="items-center flex">
            <Icon
              variant="shadow"
              icon={Clock}
              size="sm"
              className="mb-0 mr-3 text-gray-500"
            />
            <Title>
              Selected Time Range:{" "}
              <span>
                {timeRange ? (
                  <b>
                    {format(new Date(timeRange[0]), "MMMM d")} -{" "}
                    {format(new Date(timeRange[1]), "MMMM d")}
                  </b>
                ) : selecting ? (
                  <b>...</b>
                ) : (
                  <b>None</b>
                )}
              </span>
            </Title>
          </div>
          <div className="h-4"></div>
          {timeRange ? (
            <div>
              <div className="flex justify-start gap-4">
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
                <Button variant="light">View Top Entities</Button>
              </div>
            </div>
          ) : (
            <Text>Click and drag on any chart to select a time range.</Text>
          )}
        </div>
      </div>
      <div className="p-8 grid grid-cols-3 gap-8">
        {data?.anomalyCharts?.map((chart, idx) => {
          return (
            <div className="h-40" key={idx}>
              <AnomalyChart
                chart={chart}
                selectedTimeRange={timeRange}
                onSelectedTimeRangeChange={setTimeRange}
                onOpenTimeRangeContextMenu={handleContextMenu}
                onSelectingChange={setSelecting}
              />
            </div>
          );
        })}
      </div>
      <ContextMenu>
        <ContextMenuTrigger ref={triggerRef} />
        <ContextMenuContent>
          <ContextMenuLabel>
            {timeRange
              ? `Selected: ${format(
                  new Date(timeRange[0]),
                  "MMM d"
                )} – ${format(new Date(timeRange[1]), "MMM d")}`
              : "Click and drag to select a time range"}
          </ContextMenuLabel>
          {timeRange && (
            <>
              <ContextMenuItem
                onClick={() => {
                  setModalOpen(true);
                }}
              >
                See events
              </ContextMenuItem>
              <ContextMenuItem>See entities</ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
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

  const startDateString = filters.dateRange?.start
    ? format(new Date(filters.dateRange.start), "M/d")
    : undefined;
  const endDateString = filters.dateRange?.end
    ? format(new Date(filters.dateRange.end), "M/d")
    : undefined;

  const [tab, setTab] = useQueryParam("tab", NumberParam);
  const [entityType, setEntityType] = useQueryParam("entityType", StringParam);
  const [eventType, setEventType] = useQueryParam("eventType", StringParam);
  const [eventLabels, setEventLabels] = useQueryParam("eventLabel", ArrayParam);
  const [entityLabels, setEntityLabels] = useQueryParam(
    "entityLabel",
    ArrayParam
  );
  useEffect(() => {
    if (tab === 0) {
      setEntityType(undefined);
      setEntityLabels(undefined);
    }
  }, [setEntityType, setEntityLabels, tab]);

  return (
    <div>
      <Navbar />
      {/* <div className="p-4 gap-8 flex justify-start items-end">
        <Metric>
          <b>
            {startDateString} - {endDateString},{" "}
          </b>
          <span className="">
            {eventType ? `\`${eventType}\` events` : "all events"}
            {eventLabels?.length
              ? ` with labels: ${eventLabels
                  .map((label) => `\`${label}\``)
                  .join(", ")}`
              : ""}
            {entityType || entityLabels?.length
              ? `, related to ${entityType ? `\`${entityType}\`` : "entities"}`
              : ""}
            {entityLabels?.length
              ? ` with labels: ${entityLabels
                  .map((label) => `\`${label}\``)
                  .join(", ")}`
              : ""}
          </span>
        </Metric>
      </div> */}
      <div className="h-4"></div>

      <EventsPage />
    </div>
  );
}

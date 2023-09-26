import { addDays, format } from "date-fns";
import { api } from "../utils/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AreaChart, Card, Title, type Color } from "@trytrench/tremor";
import {
  useDateRange,
  useEntityFilters,
  useEventFilters,
} from "../components/Filters";
import { EntityFilters, type EventFilters } from "../shared/validation";
import { CategoricalChartState } from "recharts/types/chart/generateCategoricalChart";
import { ReferenceArea } from "recharts";

export function EventTimeChart({
  eventFilters,
  entityFilters,
  title,
  color = "gray",
}: {
  color?: Color;
  title: string;
  eventFilters?: Partial<EventFilters>;
  entityFilters?: Partial<EntityFilters>;
}) {
  const actualEventFilters = useEventFilters(eventFilters);
  const actualEntityFilters = useEntityFilters(entityFilters);

  const { data } = api.events.getTimeBuckets.useQuery(
    {
      interval: 1000 * 60 * 60 * 24,
      start: actualEventFilters?.dateRange?.from ?? 0,
      end: actualEventFilters?.dateRange?.to ?? 0,
      eventFilters: actualEventFilters,
      entityFilters: actualEntityFilters,
    },
    {
      enabled: true,
    }
  );

  const timeBuckets = data?.data ?? [];
  const labels = data?.labels ?? [];

  const [dragging, _setDragging] = useState<boolean>(false);
  const [firstX, setFirstX] = useState<string | undefined>(undefined);
  const [firstTime, setFirstTime] = useState<number | undefined>(undefined);
  const [secondX, setSecondX] = useState<string | undefined>(undefined);

  const setDragging = useCallback(
    (dragging: boolean) => {
      _setDragging(dragging);
    },
    [_setDragging]
  );

  useEffect(() => {
    if (!dragging) {
      setFirstX(undefined);
      setSecondX(undefined);
    }
  }, [dragging, setFirstX, setSecondX]);

  const [_, setDateRange] = useDateRange();

  const handleMouseDown = useCallback(
    (e: CategoricalChartState) => {
      if (!e) return;
      setFirstX(e.activeLabel);
      const firstTime = e.activePayload?.[0]?.payload.time;
      setFirstTime(firstTime);
      setSecondX(undefined);
      setDragging(true);
    },
    [setDragging]
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

      console.log(secondTime);
      console.log(e.activePayload);
      if (firstTime && secondTime) {
        if (firstTime > secondTime) {
          setDateRange({
            from: new Date(secondTime),
            to: new Date(firstTime),
          });
        } else if (firstTime < secondTime) {
          setDateRange({
            from: new Date(firstTime),
            to: new Date(secondTime),
          });
        }
      }
    },
    [dragging, firstTime, setDateRange, setDragging]
  );

  return (
    <Card>
      <Title>{title}</Title>
      <AreaChart
        className="h-72 mt-4"
        data={
          timeBuckets?.map((bucket) => ({
            date: format(addDays(new Date(bucket.bucket), 1), "MMM d"),
            time: bucket.bucket,
            ...bucket.counts,
          })) ?? []
        }
        index="date"
        categories={labels.map((label) => label.label)}
        colors={labels.map((label) => label.color)}
        tooltipOrder="byValue"
        onMouseDownChart={handleMouseDown}
        onMouseMoveChart={handleMouseMove}
        onMouseUpChart={handleMouseUp}
      >
        <ReferenceArea
          visibility={firstX && secondX ? "visible" : "hidden"}
          x1={firstX}
          x2={secondX}
          fill="gray"
          fillOpacity={0.4}
        />
      </AreaChart>
    </Card>
  );
}

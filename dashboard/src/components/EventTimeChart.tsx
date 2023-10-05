import { AreaChartProps } from "@tremor/react";
import { AreaChart } from "@trytrench/tremor";
import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { ReferenceArea } from "recharts";
import { CategoricalChartState } from "recharts/types/chart/generateCategoricalChart";
import { useQueryParams } from "use-query-params";
import { DateParam } from "~/utils/DateParam";
import { api } from "../utils/api";

interface Props extends AreaChartProps {
  entityId: string;
}

export function EntityEventChart({ entityId, ...props }: Props) {
  const [dateRange, setDateRange] = useQueryParams({
    from: DateParam,
    to: DateParam,
  });

  const { data } = api.events.getTimeBins.useQuery(
    {
      interval: 1000 * 60 * 60 * 24,
      start: dateRange.from,
      end: dateRange.to,
      entityId,
    },
    { enabled: !!dateRange.from }
  );

  const [dragging, _setDragging] = useState<boolean>(false);
  const [firstX, setFirstX] = useState<string | undefined>(undefined);
  const [firstTime, setFirstTime] = useState<string | undefined>(undefined);
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
    <AreaChart
      data={
        data?.bins
          ? Object.entries(data.bins).map(([time, labels]) => ({
              date: format(new Date(time), "MMM d"),
              time,
              ...labels,
            }))
          : []
      }
      index="date"
      categories={data?.labels}
      tooltipOrder="byValue"
      onMouseDownChart={handleMouseDown}
      onMouseMoveChart={handleMouseMove}
      onMouseUpChart={handleMouseUp}
      {...props}
    >
      <ReferenceArea
        visibility={firstX && secondX ? "visible" : "hidden"}
        x1={firstX}
        x2={secondX}
        fill="gray"
        fillOpacity={0.4}
      />
    </AreaChart>
  );
}

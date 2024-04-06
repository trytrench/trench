import { AreaChart, type AreaChartProps } from "./charts/AreaChart";
import { useCallback, useMemo, useState } from "react";
import { ReferenceArea } from "recharts";
import { type CategoricalChartState } from "recharts/types/chart/generateCategoricalChart";
import { BarChart, BarChartProps } from "./charts/BarChart";

interface Props extends BarChartProps {
  xAxisSelection?: [x1: string, x2: string];
  onXAxisSelect?: (selection: [x1: string, x2: string] | undefined) => void;
}

export const ZoomBarChart = ({
  xAxisSelection,
  onXAxisSelect,
  data,
  index,
  ...props
}: Props) => {
  const [firstX, setFirstX] = useState<string | undefined>(undefined);
  const [secondX, setSecondX] = useState<string | undefined>(undefined);

  const mapDataToIdx = useMemo(() => {
    return data.reduce(
      (acc, d, i) => {
        acc[d[index]] = i;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [data, index]);

  const smallX = useMemo(() => {
    if (!firstX || !secondX) return undefined;
    const firstIndex = mapDataToIdx[firstX];
    const secondIndex = mapDataToIdx[secondX];
    return firstIndex < secondIndex ? firstX : secondX;
  }, [firstX, mapDataToIdx, secondX]);

  const largeX = useMemo(() => {
    if (!firstX || !secondX) return undefined;
    const firstIndex = mapDataToIdx[firstX];
    const secondIndex = mapDataToIdx[secondX];
    return firstIndex < secondIndex ? secondX : firstX;
  }, [firstX, mapDataToIdx, secondX]);

  const handleMouseDown = useCallback(
    (e: CategoricalChartState) => {
      if (!e) return;
      setFirstX(e.activeLabel);
    },
    [setFirstX]
  );

  const handleMouseMove = useCallback(
    (e: CategoricalChartState) => {
      if (!e) return;
      setSecondX(e.activeLabel);
    },
    [setSecondX]
  );

  const xTicks = useMemo(() => data.map((d) => d[index]), [data, index]);

  const handleMouseUp = useCallback(
    (e: CategoricalChartState) => {
      if (!e) return;

      const finalX = e.activeLabel;
      if (!firstX || !finalX) return;

      const smaller = Math.min(xTicks.indexOf(firstX), xTicks.indexOf(finalX));
      const larger = Math.max(xTicks.indexOf(firstX), xTicks.indexOf(finalX));

      if (!smaller || !larger) return;

      const selectionSmallIdx = xTicks.indexOf(xAxisSelection?.[0]);
      const selectionLargeIdx = xTicks.indexOf(xAxisSelection?.[1]);
      if (
        smaller === larger &&
        selectionSmallIdx <= smaller &&
        larger <= selectionLargeIdx
      ) {
        setFirstX(undefined);
        setSecondX(undefined);
        onXAxisSelect?.(undefined);
      } else {
        const selection = [xTicks[smaller], xTicks[larger]] as [
          x1: string,
          x2: string,
        ];

        onXAxisSelect?.(selection);
        setFirstX(undefined);
        setSecondX(undefined);
      }
    },
    [firstX, xTicks, xAxisSelection, onXAxisSelect]
  );

  return (
    <BarChart
      {...props}
      data={data}
      index={index}
      onMouseDownChart={handleMouseDown}
      onMouseMoveChart={firstX ? handleMouseMove : undefined}
      onMouseUpChart={handleMouseUp}
    >
      <ReferenceArea
        isFront
        visibility={firstX && secondX ? "visible" : "hidden"}
        x1={smallX}
        x2={largeX}
        fill="#d1d5db"
        fillOpacity={0.2}
      />
      {xAxisSelection && (
        <ReferenceArea
          isFront
          visibility="visible"
          x1={xAxisSelection[0]}
          x2={xAxisSelection[1]}
          fill="skyblue"
          fillOpacity={0.3}
        />
      )}
    </BarChart>
  );
};

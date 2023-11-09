import { AreaChart, type AreaChartProps } from "./charts/AreaChart";
import { useCallback, useState } from "react";
import { ReferenceArea } from "recharts";
import { type CategoricalChartState } from "recharts/types/chart/generateCategoricalChart";

interface Props extends AreaChartProps {
  onZoom: (x1: string, x2: string) => void;
}

export const ZoomAreaChart = ({ onZoom, ...props }: Props) => {
  const [firstX, setFirstX] = useState<string | undefined>(undefined);
  const [secondX, setSecondX] = useState<string | undefined>(undefined);
  const handleMouseDown = useCallback(
    (e: CategoricalChartState) => {
      setFirstX(e.activeLabel);
    },
    [setFirstX]
  );

  const handleMouseMove = useCallback(
    (e: CategoricalChartState) => {
      setSecondX(e.activeLabel);
    },
    [setSecondX]
  );

  const handleMouseUp = useCallback(() => {
    if (!firstX || !secondX) return;
    onZoom(firstX, secondX);
    setFirstX(undefined);
    setSecondX(undefined);
  }, [setFirstX, setSecondX, firstX, secondX, onZoom]);

  return (
    <AreaChart
      {...props}
      onMouseDownChart={handleMouseDown}
      onMouseMoveChart={firstX ? handleMouseMove : undefined}
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
  );
};

import { BarStack, BarStackProps } from "@visx/shape";
import { Group } from "@visx/group";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { useTooltip, TooltipWithBounds } from "@visx/tooltip";
import { useSpring, animated } from "react-spring";
import { format } from "date-fns";
import { scaleBand, scaleLinear, scaleOrdinal } from "@visx/scale";

type TooltipData = {
  key: string;
  value: number;
  color: string;
};

const defaultMargin = { top: 40, right: 0, bottom: 40, left: 40 };
const background = "#f3f3f3";

const colorScale = scaleOrdinal<string, string>({
  domain: ["falseCount", "trueCount", "errorCount"],
  range: ["#98abc5", "#BCE29E", "#ff8e8e"],
});

const AnimatedBarStack = animated(BarStack);

export default function RuleExecutionStackedBarChart({
  data,
  width,
  height,
  margin = defaultMargin,
}: {
  data: {
    date: Date;
    trueCount: number;
    falseCount: number;
    errorCount: number;
  }[];
  width: number;
  height: number;
  margin?: typeof defaultMargin;
}) {
  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    hideTooltip,
    showTooltip,
  } = useTooltip<TooltipData>();

  const xScale = scaleBand<string>({
    domain: data.map((d) => `${format(d.date, "MMM dd")}`),
    padding: 0.2,
    range: [0, width - margin.left - margin.right], // add this
  });

  const yScale = scaleLinear<number>({
    domain: [0, Math.max(...data.map((d) => d.falseCount + d.trueCount))],
    range: [height - margin.top - margin.bottom, 0], // add this
  });

  const animatedProps = useSpring({
    from: { opacity: 0 },
    to: { opacity: 1 },
  });

  return (
    <div style={{ position: "relative" }}>
      <svg width={width} height={height}>
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={background}
          rx={14}
        />
        <Group top={margin.top} left={margin.left}>
          <AnimatedBarStack
            data={data}
            keys={["trueCount", "falseCount", "errorCount"]}
            x={(d) => `${format(d.date, "MMM dd")}`}
            xScale={xScale}
            yScale={yScale}
            color={(d) => colorScale(d)}
            width={width}
            height={height}
          >
            {(barStacks) =>
              barStacks.map((barStack) =>
                barStack.bars.map((bar) => (
                  <rect
                    key={`${barStack.index}-${bar.index}`}
                    x={bar.x}
                    y={bar.y}
                    height={bar.height}
                    width={bar.width}
                    fill={bar.color}
                    onMouseEnter={() =>
                      showTooltip({
                        tooltipLeft: bar.x + bar.width / 2,
                        tooltipTop: bar.y,
                        tooltipData: {
                          key: barStack.key,
                          value: bar.bar.data[barStack.key],
                          color: bar.color,
                        },
                      })
                    }
                    onMouseLeave={hideTooltip}
                  />
                ))
              )
            }
          </AnimatedBarStack>
          <AxisLeft
            scale={yScale}
            top={0}
            left={0}
            label={"False"}
            stroke={"#1b1a1e"}
            tickTextFill={"#1b1a1e"}
          />
          <AxisBottom
            scale={xScale}
            top={yScale.range()[0]}
            label={"Date"}
            stroke={"#1b1a1e"}
            tickTextFill={"#1b1a1e"}
          />
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          key={Math.random()}
          top={tooltipTop}
          left={tooltipLeft}
        >
          <div>
            <strong>
              {tooltipData.key === "falseCount"
                ? "False"
                : tooltipData.key === "trueCount"
                ? "True"
                : "Error"}
            </strong>
            : {tooltipData.value}
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

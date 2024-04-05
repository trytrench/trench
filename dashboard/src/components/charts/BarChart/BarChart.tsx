"use client";
import React, { useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Legend,
  BarChart as ReChartsBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type AxisDomain } from "recharts/types/util/types";

import {
  constructCategoryColors,
  deepEqual,
  getYAxisDomain,
} from "../common/utils";
import type BaseChartProps from "../common/BaseChartProps";
import ChartLegend from "../common/ChartLegend";
import ChartTooltip from "../common/ChartTooltip";
import NoData from "../common/NoData";

import {
  BaseColors,
  defaultValueFormatter,
  themeColorRange,
  colorPalette,
  getColorClassNames,
  twMerge,
} from "../lib";
import { type CurveType } from "../lib/inputTypes";
import { type CategoricalChartFunc } from "recharts/types/chart/generateCategoricalChart";

const renderShape = (
  props: any,
  activeBar: any,
  activeLegend: string | undefined,
  layout: string
) => {
  const { fillOpacity, name, payload, value } = props;
  let { x, width, y, height } = props;

  if (layout === "horizontal" && height < 0) {
    y += height;
    height = Math.abs(height as number); // height must be a positive number
  } else if (layout === "vertical" && width < 0) {
    x += width;
    width = Math.abs(width as number); // width must be a positive number
  }

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      opacity={
        activeBar || (activeLegend && activeLegend !== name)
          ? deepEqual(activeBar, { ...payload, value })
            ? fillOpacity
            : 0.3
          : fillOpacity
      }
    />
  );
};

export interface BarChartProps extends BaseChartProps {
  layout?: "vertical" | "horizontal";
  stack?: boolean;
  relative?: boolean;
  barCategoryGap?: string | number;

  onClickChart?: CategoricalChartFunc;
  onMouseLeaveChart?: CategoricalChartFunc;
  onMouseEnterChart?: CategoricalChartFunc;
  onMouseMoveChart?: CategoricalChartFunc;
  onMouseDownChart?: CategoricalChartFunc;
  onMouseUpChart?: CategoricalChartFunc;

  formatXAxis?: (value: string) => string;
  formatTooltip?: (value: string) => string;
}

const BarChart = React.forwardRef<HTMLDivElement, BarChartProps>(
  (props, ref) => {
    const {
      data = [],
      categories = [],
      index,
      colors = themeColorRange,
      valueFormatter = defaultValueFormatter,
      layout = "horizontal",
      stack = false,
      relative = false,
      startEndOnly = false,
      animationDuration = 900,
      showAnimation = false,
      showXAxis = true,
      showYAxis = true,
      yAxisWidth = 56,
      // intervalType = "equidistantPreserveStart",
      showTooltip = true,
      showLegend = true,
      showGridLines = true,
      autoMinValue = false,
      minValue,
      maxValue,
      allowDecimals = true,
      noDataText,
      // onValueChange,
      // enableLegendSlider = false,
      // customTooltip,
      // rotateLabelX,
      barCategoryGap,
      // tickGap = 5,
      className,

      onClickChart,
      onMouseLeaveChart,
      onMouseEnterChart,
      onMouseMoveChart,
      onMouseDownChart,
      onMouseUpChart,

      formatXAxis,
      formatTooltip,

      children,
      ...other
    } = props;
    const [legendHeight, setLegendHeight] = useState(60);
    const categoryColors = constructCategoryColors(categories, colors);

    const yAxisDomain = getYAxisDomain(autoMinValue, minValue, maxValue);
    return (
      <div ref={ref} className={twMerge("w-full h-80", className)} {...other}>
        <ResponsiveContainer className="h-full w-full">
          {data?.length ? (
            <ReChartsBarChart
              data={data}
              onClick={onClickChart}
              onMouseLeave={onMouseLeaveChart}
              onMouseEnter={onMouseEnterChart}
              onMouseMove={onMouseMoveChart}
              onMouseDown={onMouseDownChart}
              onMouseUp={onMouseUpChart}
            >
              {showGridLines ? (
                <CartesianGrid
                  className={twMerge(
                    // common
                    "stroke-1",
                    // light
                    "stroke-tremor-border",
                    // dark
                    "dark:stroke-dark-tremor-border"
                  )}
                  horizontal={layout !== "vertical"}
                  vertical={layout === "vertical"}
                />
              ) : null}

              {layout !== "vertical" ? (
                <XAxis
                  hide={!showXAxis}
                  dataKey={index}
                  tick={{ transform: "translate(0, 6)" }}
                  ticks={
                    startEndOnly
                      ? [data[0][index], data[data.length - 1][index]]
                      : undefined
                  }
                  fill=""
                  stroke=""
                  className={twMerge(
                    // common
                    "text-xs text-muted-foreground",
                    // light
                    "fill-muted-foreground",
                    // dark
                    "dark:fill-muted-foreground"
                  )}
                  interval="preserveStartEnd"
                  tickLine={false}
                  axisLine={false}
                  padding={{ left: 10, right: 10 }}
                  minTickGap={16}
                  tickFormatter={formatXAxis}
                />
              ) : (
                <XAxis
                  hide={!showXAxis}
                  dataKey={index}
                  tick={{ transform: "translate(0, 6)" }}
                  ticks={
                    startEndOnly
                      ? [data[0][index], data[data.length - 1][index]]
                      : undefined
                  }
                  fill=""
                  stroke=""
                  className={twMerge(
                    // common
                    "text-xs text-muted-foreground",
                    // light
                    "fill-muted-foreground",
                    // dark
                    "dark:fill-muted-foreground"
                  )}
                  interval="preserveStartEnd"
                  tickLine={false}
                  axisLine={false}
                  padding={{ left: 10, right: 10 }}
                  minTickGap={16}
                  tickFormatter={formatXAxis}
                />
              )}
              {layout !== "vertical" ? (
                <YAxis
                  width={yAxisWidth}
                  hide={!showYAxis}
                  axisLine={false}
                  tickLine={false}
                  type="number"
                  allowDataOverflow={true}
                  // domain={[0, 500]}
                  domain={yAxisDomain as AxisDomain}
                  tick={{ transform: "translate(-3, 0)" }}
                  fill=""
                  stroke=""
                  className={twMerge(
                    // common
                    "text-xs text-muted-foreground",
                    // light
                    "fill-muted-foreground",
                    // dark
                    "dark:fill-muted-foreground"
                  )}
                  tickFormatter={valueFormatter}
                  allowDecimals={allowDecimals}
                />
              ) : (
                <YAxis
                  width={yAxisWidth}
                  hide={!showYAxis}
                  axisLine={false}
                  tickLine={false}
                  type="number"
                  allowDataOverflow={true}
                  // domain={[0, 500]}
                  domain={yAxisDomain as AxisDomain}
                  tick={{ transform: "translate(-3, 0)" }}
                  fill=""
                  stroke=""
                  className={twMerge(
                    // common
                    "text-xs text-muted-foreground",
                    // light
                    "fill-muted-foreground",
                    // dark
                    "dark:fill-muted-foreground"
                  )}
                  tickFormatter={valueFormatter}
                  allowDecimals={allowDecimals}
                />
              )}
              <Tooltip
                wrapperStyle={{ outline: "none" }}
                isAnimationActive={false}
                cursor={{ fill: "#d1d5db", opacity: "0.2" }}
                content={
                  showTooltip ? (
                    ({ active, payload, label }) => (
                      <ChartTooltip
                        active={active}
                        payload={payload}
                        label={
                          typeof label === "string"
                            ? formatTooltip
                              ? formatTooltip(label)
                              : label
                            : label
                        }
                        valueFormatter={valueFormatter}
                        categoryColors={categoryColors}
                      />
                    )
                  ) : (
                    <></>
                  )
                }
                position={{ y: 0 }}
              />
              {showLegend ? (
                <Legend
                  verticalAlign="top"
                  height={legendHeight}
                  content={({ payload }) =>
                    ChartLegend({ payload }, categoryColors, setLegendHeight)
                  }
                />
              ) : null}
              {categories.map((category) => (
                <Bar
                  className={twMerge(
                    getColorClassNames(
                      categoryColors.get(category) ?? BaseColors.Gray,
                      colorPalette.background
                    ).fillColor
                    // onValueChange ? "cursor-pointer" : ""
                  )}
                  key={category}
                  name={category}
                  type="linear"
                  stackId={stack || relative ? "a" : undefined}
                  dataKey={category}
                  fill=""
                  isAnimationActive={showAnimation}
                  animationDuration={animationDuration}
                  // shape={(props: any) =>
                  //   renderShape(props, activeBar, activeLegend, layout)
                  // }
                  // onClick={onBarClick}
                />
              ))}
              {children}
            </ReChartsBarChart>
          ) : (
            <NoData noDataText={noDataText} />
          )}
        </ResponsiveContainer>
      </div>
    );
  }
);

BarChart.displayName = "BarChart";

export default BarChart;

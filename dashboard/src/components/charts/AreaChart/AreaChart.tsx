"use client";
import React, { useState } from "react";
import {
  Area,
  CartesianGrid,
  Legend,
  AreaChart as ReChartsAreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type AxisDomain } from "recharts/types/util/types";

import { constructCategoryColors, getYAxisDomain } from "../common/utils";
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

export interface AreaChartProps extends BaseChartProps {
  stack?: boolean;
  tooltipOrder: "byCategory" | "byValue";
  curveType?: CurveType;
  connectNulls?: boolean;

  onClickChart?: CategoricalChartFunc;
  onMouseLeaveChart?: CategoricalChartFunc;
  onMouseEnterChart?: CategoricalChartFunc;
  onMouseMoveChart?: CategoricalChartFunc;
  onMouseDownChart?: CategoricalChartFunc;
  onMouseUpChart?: CategoricalChartFunc;

  formatXAxis?: (value: string) => string;
  formatTooltip?: (value: string) => string;
}

const AreaChart = React.forwardRef<HTMLDivElement, AreaChartProps>(
  (props, ref) => {
    const {
      data = [],
      categories = [],
      index,
      stack = false,
      tooltipOrder = "byCategory",
      colors = themeColorRange,
      valueFormatter = defaultValueFormatter,
      startEndOnly = false,
      showXAxis = true,
      showYAxis = true,
      yAxisWidth = 56,
      showAnimation = true,
      animationDuration = 900,
      showTooltip = true,
      showLegend = true,
      showGridLines = true,
      showGradient = true,
      autoMinValue = false,
      curveType = "linear",
      minValue,
      maxValue,
      connectNulls = false,
      allowDecimals = true,
      noDataText,
      className,
      children,

      onClickChart,
      onMouseLeaveChart,
      onMouseEnterChart,
      onMouseMoveChart,
      onMouseDownChart,
      onMouseUpChart,
      formatXAxis,
      ...other
    } = props;
    const [legendHeight, setLegendHeight] = useState(60);
    const categoryColors = constructCategoryColors(categories, colors);

    const yAxisDomain = getYAxisDomain(autoMinValue, minValue, maxValue);
    return (
      <div ref={ref} className={twMerge("w-full h-80", className)} {...other}>
        <ResponsiveContainer className="h-full w-full">
          {data?.length ? (
            <ReChartsAreaChart
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
                    "stroke-secondary-foreground"
                  )}
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                />
              ) : null}
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
              {showTooltip ? (
                <Tooltip
                  wrapperStyle={{ outline: "none" }}
                  isAnimationActive={false}
                  cursor={{ stroke: "#d1d5db", strokeWidth: 1 }} // @achi @severin
                  itemSorter={(item) =>
                    tooltipOrder === "byValue" && typeof item.value === "number"
                      ? -item.value
                      : -1
                  }
                  content={({ active, payload, label, itemSorter }) => (
                    <ChartTooltip
                      active={active}
                      payload={payload}
                      label={label}
                      itemSorter={itemSorter}
                      valueFormatter={valueFormatter}
                      categoryColors={categoryColors}
                    />
                  )}
                  position={{ y: 0 }}
                />
              ) : null}
              {showLegend ? (
                <Legend
                  verticalAlign="top"
                  height={legendHeight}
                  content={({ payload }) =>
                    ChartLegend({ payload }, categoryColors, setLegendHeight)
                  }
                />
              ) : null}
              {categories.map((category) => {
                return (
                  <defs key={category}>
                    {showGradient ? (
                      <linearGradient
                        className={
                          getColorClassNames(
                            categoryColors.get(category) ?? BaseColors.Gray,
                            colorPalette.text
                          ).textColor
                        }
                        id={categoryColors.get(category)}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="currentColor"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="currentColor"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    ) : (
                      <linearGradient
                        className={
                          getColorClassNames(
                            categoryColors.get(category) ?? BaseColors.Gray,
                            colorPalette.text
                          ).textColor
                        }
                        id={categoryColors.get(category)}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop stopColor="currentColor" stopOpacity={0.3} />
                      </linearGradient>
                    )}
                  </defs>
                );
              })}
              {categories.map((category) => (
                <Area
                  className={
                    getColorClassNames(
                      categoryColors.get(category) ?? BaseColors.Gray,
                      colorPalette.text
                    ).strokeColor
                  }
                  activeDot={{
                    className: twMerge(
                      "",
                      getColorClassNames(
                        categoryColors.get(category) ?? BaseColors.Gray,
                        colorPalette.text
                      ).fillColor
                    ),
                  }}
                  dot={false}
                  key={category}
                  name={category}
                  type={curveType}
                  dataKey={category}
                  fill={`url(#${categoryColors.get(category)})`}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  isAnimationActive={showAnimation}
                  animationDuration={animationDuration}
                  stackId={stack ? "a" : undefined}
                  connectNulls={connectNulls}
                />
              ))}
              {children}
            </ReChartsAreaChart>
          ) : (
            <NoData noDataText={noDataText} />
          )}
        </ResponsiveContainer>
      </div>
    );
  }
);

AreaChart.displayName = "AreaChart";

export default AreaChart;

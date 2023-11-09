import React from "react";
import { twMerge } from "../lib";

import { type Color, type ValueFormatter } from "../lib";
import {
  BaseColors,
  border,
  getColorClassNames,
  sizing,
  spacing,
} from "../lib";
import { colorPalette } from "../lib/theme";

export const ChartTooltipFrame = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <div
    className={twMerge(
      // common
      "rounded-md foreground",
      // light
      "bg-background shadow-sm border",
      // dark
      "",
      border.sm.all
    )}
  >
    {children}
  </div>
);

export interface ChartTooltipRowProps {
  value: string;
  name: string;
  color: Color;
}

export const ChartTooltipRow = ({
  value,
  name,
  color,
}: ChartTooltipRowProps) => (
  <div className="flex items-center justify-between space-x-8">
    <div className="flex items-center space-x-2">
      <span
        className={twMerge(
          // common
          "shrink-0 rounded-full",
          // light
          "border-background shadow-sm border",
          // dark
          "dark:border-dark-tremor-background dark:shadow-dark-tremor-card",
          getColorClassNames(color, colorPalette.background).bgColor,
          sizing.sm.height,
          sizing.sm.width,
          border.md.all
        )}
      />
      <p
        className={twMerge(
          // commmon
          "text-right whitespace-nowrap text-sm",
          // light
          "foreground",
          // dark
          "dark:foreground"
        )}
      >
        {name}
      </p>
    </div>
    <p
      className={twMerge(
        // common
        "font-medium tabular-nums text-sm text-right whitespace-nowrap",
        // light
        "text-emphasis-foreground",
        // dark
        "dark:text-dark-emphasis-foreground"
      )}
    >
      {value}
    </p>
  </div>
);

export interface ChartTooltipProps {
  active: boolean | undefined;
  payload: any;
  label: string;
  categoryColors: Map<string, Color>;
  valueFormatter: ValueFormatter;
  itemSorter?: (item: any) => number | string;
}

const ChartTooltip = ({
  active,
  payload,
  label,
  categoryColors,
  valueFormatter,
  itemSorter = () => -1,
}: ChartTooltipProps) => {
  payload = payload?.sort((a: any, b: any) => {
    return itemSorter(a) < itemSorter(b) ? -1 : 1;
  });
  if (active && payload) {
    const singlePayload = payload.length === 1;
    return (
      <ChartTooltipFrame>
        <div
          className={twMerge(
            // light
            "border-1",
            // dark
            "dark:border-1 flex justify-between",
            spacing.twoXl.paddingX,
            spacing.sm.paddingY,
            border.sm.bottom
          )}
        >
          <p
            className={twMerge(
              // common
              "font-medium text-sm",
              // light
              singlePayload ? "foreground" : "text-emphasis-foreground",
              // dark
              singlePayload
                ? "dark:foreground"
                : "dark:text-dark-emphasis-foreground"
            )}
          >
            {label}
          </p>
          {singlePayload && (
            <p
              className={twMerge(
                // common
                "font-medium",
                // light
                "text-emphasis-foreground",
                // dark
                "dark:text-dark-emphasis-foreground",
                spacing.threeXl.marginLeft
              )}
            >
              {valueFormatter(payload[0]?.value)}
            </p>
          )}
        </div>

        {!singlePayload && (
          <div
            className={twMerge(
              spacing.twoXl.paddingX,
              spacing.sm.paddingY,
              "space-y-1"
            )}
          >
            {payload.map(
              (
                { value, name }: { value: number; name: string },
                idx: number
              ) => (
                <ChartTooltipRow
                  key={`id-${idx}`}
                  value={valueFormatter(value)}
                  name={name}
                  color={categoryColors.get(name) ?? BaseColors.Blue}
                />
              )
            )}
          </div>
        )}
      </ChartTooltipFrame>
    );
  }
  return null;
};

export default ChartTooltip;

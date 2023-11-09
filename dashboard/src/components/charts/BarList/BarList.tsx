import React from "react";
import { twMerge } from "../lib";

import {
  defaultValueFormatter,
  getColorClassNames,
  makeClassName,
  sizing,
  spacing,
} from "../lib";
import { type Color, type ValueFormatter } from "../lib";
import { colorPalette } from "../lib/theme";

const makeBarListClassName = makeClassName("BarList");

type Bar = {
  key?: string;
  value: number;
  name: string;
  icon?: React.JSXElementConstructor<any>;
  href?: string;
  target?: string;
  color?: Color;
};

const getWidthsFromValues = (dataValues: number[]) => {
  let maxValue = -Infinity;
  dataValues.forEach((value) => {
    maxValue = Math.max(maxValue, value);
  });

  return dataValues.map((value) => {
    if (value === 0) return 0;
    return Math.max((value / maxValue) * 100, 1);
  });
};

export interface BarListProps extends React.HTMLAttributes<HTMLDivElement> {
  data: Bar[];
  valueFormatter?: ValueFormatter;
  color?: Color;
  showAnimation?: boolean;
}

const BarList = React.forwardRef<HTMLDivElement, BarListProps>((props, ref) => {
  const {
    data = [],
    color,
    valueFormatter = defaultValueFormatter,
    showAnimation = true,
    className,
    ...other
  } = props;

  const widths = getWidthsFromValues(data.map((item) => item.value));

  const rowHeight = sizing.threeXl.height;

  return (
    <div
      ref={ref}
      className={twMerge(
        makeBarListClassName("root"),
        "flex justify-between text-sm",
        spacing.threeXl.spaceX,
        className
      )}
      {...other}
    >
      <div className={twMerge(makeBarListClassName("bars"), "relative w-full")}>
        {data.map((item, idx) => {
          const Icon = item.icon;

          return (
            <div
              key={item.key ?? item.name}
              className={twMerge(
                makeBarListClassName("bar"),
                // common
                "flex items-center rounded-sm",
                rowHeight,
                item.color ?? color
                  ? getColorClassNames(
                      item.color ?? color!,
                      colorPalette.lightBackground
                    ).bgColor
                  : "bg-primary",
                idx === data.length - 1
                  ? spacing.none.marginBottom
                  : spacing.sm.marginBottom
              )}
              style={{
                width: `${widths[idx]}%`,
                transition: showAnimation ? "all 1s" : "",
              }}
            >
              <div
                className={twMerge("absolute max-w-full flex", spacing.sm.left)}
              >
                {Icon ? (
                  <Icon
                    className={twMerge(
                      makeBarListClassName("barIcon"),
                      // common
                      "flex-none",
                      // light
                      "text-foreground",
                      // dark
                      "",
                      sizing.lg.height,
                      sizing.lg.width,
                      spacing.md.marginRight
                    )}
                  />
                ) : null}
                {item.href ? (
                  <a
                    href={item.href}
                    target={item.target ?? "_blank"}
                    rel="noreferrer"
                    className={twMerge(
                      makeBarListClassName("barLink"),
                      // common
                      "whitespace-nowrap hover:underline truncate text-foreground",
                      // light
                      "text-emphasis-foreground",
                      // dark
                      ""
                    )}
                  >
                    {item.name}
                  </a>
                ) : (
                  <p
                    className={twMerge(
                      makeBarListClassName("barText"),
                      // common
                      "whitespace-nowrap truncate text-foreground",
                      // light
                      "text-emphasis-foreground",
                      // dark
                      ""
                    )}
                  >
                    {item.name}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className={(makeBarListClassName("labels"), "text-right min-w-min")}>
        {data.map((item, idx) => (
          <div
            key={item.key ?? item.name}
            className={twMerge(
              makeBarListClassName("labelWrapper"),
              "flex justify-end items-center",
              rowHeight,
              idx === data.length - 1
                ? spacing.none.marginBottom
                : spacing.sm.marginBottom
            )}
          >
            <p
              className={twMerge(
                makeBarListClassName("labelText"),
                // common
                "whitespace-nowrap truncate text-foreground",
                // light
                "text-emphasis-foreground",
                // dark
                ""
              )}
            >
              {valueFormatter(item.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
});

BarList.displayName = "BarList";

export default BarList;

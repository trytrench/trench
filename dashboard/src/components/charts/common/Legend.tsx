import React from "react";

import { Color, twMerge } from "../lib";
import { getColorClassNames, sizing, spacing, themeColorRange } from "../lib";
import { colorPalette } from "../lib/theme";

export interface LegendItemProps {
  name: string;
  color: Color;
}

const LegendItem = ({ name, color }: LegendItemProps) => (
  <li
    className={twMerge(
      // common
      "inline-flex items-center truncate",
      // light
      "foreground",
      // dark
      "dark:foreground",
      spacing.md.marginRight
    )}
  >
    <svg
      className={twMerge(
        "flex-none",
        getColorClassNames(color, colorPalette.text).textColor,
        sizing.xs.height,
        sizing.xs.width,
        spacing.xs.marginRight
      )}
      fill="currentColor"
      viewBox="0 0 8 8"
    >
      <circle cx={4} cy={4} r={4} />
    </svg>
    <p
      className={twMerge(
        // common
        "whitespace-nowrap truncate foreground",
        // light
        "foreground",
        // dark
        "dark:foreground"
      )}
    >
      {name}
    </p>
  </li>
);

export interface LegendProps extends React.OlHTMLAttributes<HTMLOListElement> {
  categories: string[];
  colors?: Color[];
}

const Legend = React.forwardRef<HTMLOListElement, LegendProps>((props, ref) => {
  const { categories, colors = themeColorRange, className, ...other } = props;
  return (
    <ol
      ref={ref}
      className={twMerge(
        "flex flex-wrap overflow-hidden truncate text-sm",
        className
      )}
      {...other}
    >
      {categories.map((category, idx) => (
        <LegendItem key={`item-${idx}`} name={category} color={colors[idx]} />
      ))}
    </ol>
  );
});

Legend.displayName = "Legend";

export default Legend;

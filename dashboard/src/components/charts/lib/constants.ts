import {
  type Color,
  type DeltaType,
  type HorizontalPosition,
  type Size,
  type VerticalPosition,
} from "./inputTypes";

export const DeltaTypes: Record<string, DeltaType> = {
  Increase: "increase",
  ModerateIncrease: "moderateIncrease",
  Decrease: "decrease",
  ModerateDecrease: "moderateDecrease",
  Unchanged: "unchanged",
};

export enum BaseColors {
  Slate = "slate",
  Gray = "gray",
  Zinc = "zinc",
  Neutral = "neutral",
  Stone = "stone",
  Red = "red",
  Orange = "orange",
  Amber = "amber",
  Yellow = "yellow",
  Lime = "lime",
  Green = "green",
  Emerald = "emerald",
  Teal = "teal",
  Cyan = "cyan",
  Sky = "sky",
  Blue = "blue",
  Indigo = "indigo",
  Violet = "violet",
  Purple = "purple",
  Fuchsia = "fuchsia",
  Pink = "pink",
  Rose = "rose",
}

export const Sizes: Record<string, Size> = {
  XS: "xs",
  SM: "sm",
  MD: "md",
  LG: "lg",
  XL: "xl",
};

export const HorizontalPositions: Record<string, HorizontalPosition> = {
  Left: "left",
  Right: "right",
};

export const VerticalPositions: Record<string, VerticalPosition> = {
  Top: "top",
  Bottom: "bottom",
};

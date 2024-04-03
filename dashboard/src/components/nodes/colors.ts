export enum FeatureColor {
  Gray = "gray",
  Green = "green",
  Yellow = "yellow",
  Orange = "orange",
  Red = "red",
  Pink = "pink",
}

export const DOT_COLOR_MAP: Record<FeatureColor, string> = {
  [FeatureColor.Gray]: "bg-gray-400",
  [FeatureColor.Green]: "bg-green-600",
  [FeatureColor.Yellow]: "bg-yellow-300",
  [FeatureColor.Orange]: "bg-orange-400",
  [FeatureColor.Red]: "bg-red-500",
  [FeatureColor.Pink]: "bg-pink-300",
};

export const LABEL_COLOR_MAP: Record<FeatureColor, string> = {
  [FeatureColor.Gray]: "bg-gray-100 text-gray-800",
  [FeatureColor.Green]: "bg-green-100 text-green-800",
  [FeatureColor.Yellow]: "bg-yellow-100 text-yellow-800",
  [FeatureColor.Orange]: "bg-orange-100 text-orange-800",
  [FeatureColor.Red]: "bg-red-100 text-red-800",
  [FeatureColor.Pink]: "bg-pink-100 text-pink-800",
};

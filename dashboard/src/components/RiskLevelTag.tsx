import { Tag, TagLabel } from "@chakra-ui/react";
import { RiskLevel } from "../common/types";

export const MAP_RISK_LEVEL_TO_DATA: Record<
  string,
  {
    color: string;
    label: string;
  }
> = {
  [RiskLevel.VeryHigh]: {
    color: "red",
    label: "Very High",
  },
  [RiskLevel.High]: {
    color: "pink",
    label: "High",
  },
  [RiskLevel.Medium]: {
    color: "orange",
    label: "Medium",
  },
  [RiskLevel.Normal]: {
    color: "gray",
    label: "Normal",
  },
};

export function RiskLevelTag({ riskLevel }: { riskLevel?: string }) {
  const color = riskLevel
    ? MAP_RISK_LEVEL_TO_DATA[riskLevel]?.color ?? "gray"
    : "gray";
  const label = riskLevel
    ? MAP_RISK_LEVEL_TO_DATA[riskLevel]?.label ?? "Unknown"
    : "Unknown";

  return (
    <Tag colorScheme={color} size="sm" px={1.5}>
      <TagLabel>{label}</TagLabel>
    </Tag>
  );
}

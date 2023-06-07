import { Tag, TagLabel } from "@chakra-ui/react";
import { RiskLevel } from "@prisma/client";

export const MAP_RISK_LEVEL_TO_DATA = {
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

export function RiskLevelTag({ riskLevel }: { riskLevel: RiskLevel }) {
  const color = MAP_RISK_LEVEL_TO_DATA[riskLevel]?.color ?? "gray";
  const label = MAP_RISK_LEVEL_TO_DATA[riskLevel]?.label ?? "Unknown";
  return (
    <Tag colorScheme={color} size="sm" px={1.5}>
      <TagLabel>{label}</TagLabel>
    </Tag>
  );
}

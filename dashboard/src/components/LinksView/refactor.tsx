import { useState } from "react";
import LinksView from "./index";
import { api } from "~/utils/api";
import { dummyUserLabels } from "~/pages/links/dummy";

// uhhhhhhhhh
interface LinksDisplayProps {
  entityId: string;
  entityFilter: {
    entityType: string;
  };
  onEntityFilterChange: (value: string) => void;
}

export default function LinksDisplay({
  entityId,
  entityFilter,
  onEntityFilterChange,
}: LinksDisplayProps) {
  const { data } = api.links.relatedEntities.useQuery(
    {
      id: entityId ?? "",
    },
    { enabled: !!entityId }
  );
  const { data: entityInfo } = api.links.entityInfo.useQuery(
    {
      id: entityId ?? "",
    },
    { enabled: !!entityId }
  );

  const leftSide = data?.leftSide ?? [];
  const rightSide = data?.rightSide ?? [];
  const links = data?.links ?? [];

  const leftSideTypes = [...new Set(leftSide.map((item) => item.type))];

  const labels = dummyUserLabels;

  return (
    <LinksView
      data={{
        left: leftSide,
        right: rightSide,
        links: links,
        entityInfo,
        entityLabels: labels,
      }}
      leftTypeFilter={entityFilter.entityType}
      onLeftTypeFilterChange={onEntityFilterChange}
    />
  );
}

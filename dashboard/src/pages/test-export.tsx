import { cn } from "../lib/utils";
import { api } from "../utils/api";
import React, { useCallback, useEffect, useRef, useState } from "react";

export default function Page() {
  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const { data: features } = api.features.list.useQuery();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedEntityType = entityTypes?.find((et) => et.id === selectedId);

  const filteredFeatures = features?.filter((feature) => {
    return feature.entityTypeId === selectedId;
  });

  return (
    <div className="w-screen h-screen flex">
      <div className="flex flex-col">
        {entityTypes?.map((entityType) => {
          return (
            <button
              className={cn({
                border: true,
                "border-black": selectedId === entityType.id,
                "border-transparent": selectedId !== entityType.id,
              })}
              key={entityType.id}
              onClick={() => {
                setSelectedId(entityType.id);
              }}
            >
              {entityType.type}
            </button>
          );
        })}
      </div>

      <div>
        <pre className="text-xs">
          {JSON.stringify(
            {
              entityType: selectedEntityType,
              features: filteredFeatures,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}

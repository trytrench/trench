import { useMemo } from "react";
import { api } from "~/utils/api";

export const useEntityNameMap = (entityIds: string[]) => {
  const { data: entities } = api.features.getFeatures.useQuery(
    {
      entityIds,
      featureIds: [],
    },
    { enabled: !!entityIds.length }
  );

  const entityNameMap = useMemo(() => {
    const names: Record<string, string> = {};
    for (const entity of entities ?? []) {
      for (const feature of entity.features) {
        names[entity.entityId] =
          feature.result.type === "success"
            ? feature.result.data.value
            : entity.entityId;
      }
    }
    return names;
  }, [entities]);

  return entityNameMap;
};

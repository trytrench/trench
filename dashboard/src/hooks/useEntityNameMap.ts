import { useMemo } from "react";
import { api } from "~/utils/api";

export const useEntityNameMap = (entityIds: string[]) => {
  const { data: features } = api.features.list.useQuery();

  const nameFeatureIds = useMemo(() => {
    return (
      features
        ?.filter((f) => f.name === "Name" && f.entityTypeId)
        .map((f) => f.id) ?? []
    );
  }, [features]);

  const { data: entities } = api.features.getFeatures.useQuery(
    {
      entityIds,
      featureIds: nameFeatureIds,
    },
    { enabled: !!nameFeatureIds.length && !!entityIds.length }
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

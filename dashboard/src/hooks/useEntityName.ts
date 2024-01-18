import { useMemo } from "react";
import { RouterOutputs, api } from "~/utils/api";

export const useEntityName = (
  entity?: RouterOutputs["lists"]["getEntitiesList"]["rows"][number]
) => {
  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const entityName = useMemo<string | undefined>(() => {
    const nameFeature = entity?.features.find(
      (feature) => feature.featureName === "Name"
    );

    if (nameFeature?.result.type === "success") {
      return nameFeature.result.data.value;
    }
  }, [entity]);

  const entityTypeName = useMemo<string | undefined>(() => {
    return entityTypes?.find((type) => type.id === entity?.entityType)?.type;
  }, [entityTypes, entity]);

  return { entityName, entityTypeName };
};

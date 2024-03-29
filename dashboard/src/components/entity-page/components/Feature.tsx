import { useAtom } from "jotai";
import { api } from "../../../utils/api";
import { EntityPageComponent } from "./types";
import { isEditModeAtom } from "../state";
import { RenderResult } from "../../RenderResult";
import { FeatureSelector } from "../FeatureSelector";
import { TypeName } from "event-processing";
import { EntityFilter, EntityFilterType } from "../../../shared/validation";
import { useMemo } from "react";

export interface FeatureConfig {
  featurePath: string[];
}

export const FeatureComponent: EntityPageComponent<FeatureConfig> = ({
  id,
  entity,
  config,
  setConfig,
}) => {
  const [isEditMode] = useAtom(isEditModeAtom);
  // Component implementation
  const filters = useMemo(() => {
    const arr: EntityFilter[] = [];
    if (entity) {
      arr.push({ type: EntityFilterType.EntityId, data: entity.id });
      arr.push({ type: EntityFilterType.EntityType, data: entity.type });
    }
    return arr;
  }, [entity]);
  const { data: entitiesData } = api.lists.getEntitiesList.useQuery({
    entityFilters: filters,
  });
  const features = entitiesData?.rows[0]?.features ?? [];

  const targetFeatureId =
    config.featurePath[config.featurePath.length - 1] ?? null;

  const desiredFeature = features.find(
    (feature) => feature.featureId === targetFeatureId
  );

  const { data: allFeatures } = api.features.list.useQuery();
  const featureMetadata = allFeatures?.find((f) => f.id === targetFeatureId);

  const { data } = api.features.getValue.useQuery(
    {
      entity,
      featurePath: config.featurePath,
    },
    {
      enabled: !!config.featurePath.length,
    }
  );

  return (
    <div>
      {isEditMode ? (
        <div>
          <FeatureSelector
            desiredSchema={{ type: TypeName.Any }}
            baseEntityTypeId={entity.type}
            value={config.featurePath}
            onChange={(val) => {
              setConfig({
                featurePath: val,
              });
            }}
          />
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      ) : (
        <div className="flex items-baseline gap-2 border">
          <div className="text-gray-400">{featureMetadata?.name}</div>
          {data && <RenderResult result={data.result} />}
        </div>
      )}
    </div>
  );
};

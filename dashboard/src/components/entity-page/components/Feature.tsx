import { useAtom } from "jotai";
import { api } from "../../../utils/api";
import { ComponentType } from "./_enum";
import { EntityPageComponent } from "./types";
import { isEditModeAtom } from "../state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../../ui/select";
import { RenderResult, RenderTypedData } from "../../RenderResult";
import { FeatureSelector } from "../FeatureSelector";
import { useState } from "react";
import { TypeName } from "event-processing";
import { FeaturePathItem } from "../../../shared/types";

export interface FeatureConfig {
  featurePath: FeaturePathItem[];
}

export const FeatureComponent: EntityPageComponent<FeatureConfig> = ({
  id,
  entity,
  config,
  setConfig,
}) => {
  const [isEditMode] = useAtom(isEditModeAtom);
  // Component implementation
  const { data: entitiesData } = api.lists.getEntitiesList.useQuery({
    entityFilters: { entityId: entity.id, entityType: entity.type },
  });
  const features = entitiesData?.rows[0]?.features ?? [];

  const targetFeatureId =
    config.featurePath[config.featurePath.length - 1]?.featureId ?? null;

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

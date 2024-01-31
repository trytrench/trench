import { useAtom } from "jotai";
import { api } from "../../../utils/api";
import { useComponentConfig } from "../useComponentConfig";
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
  featureId: string | null;
}

export const FeatureComponent: EntityPageComponent<FeatureConfig> = ({
  id,
  entity,
}) => {
  const [config, setConfig] = useComponentConfig<ComponentType.Feature>(id);
  const [isEditMode] = useAtom(isEditModeAtom);
  // Component implementation
  const { data: entitiesData } = api.lists.getEntitiesList.useQuery({
    entityFilters: { entityId: entity.id, entityType: entity.type },
  });
  const features = entitiesData?.rows[0]?.features ?? [];

  const desiredFeature = features.find(
    (feature) => feature.featureId === config.config.featureId
  );

  const [path, setPath] = useState<FeaturePathItem[]>([]);

  const { data } = api.features.getValue.useQuery(
    {
      entity,
      featurePath: path,
    },
    {
      enabled: !!path.length,
    }
  );
  return (
    <div>
      {isEditMode ? (
        <div>
          <FeatureSelector
            desiredSchema={{ type: TypeName.String }}
            baseEntityTypeId={entity.type}
            value={path}
            onChange={setPath}
          />
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      ) : (
        <div className="flex items-baseline gap-2">
          <div className="text-gray-400">{desiredFeature?.featureName}</div>
          {desiredFeature && <RenderResult result={desiredFeature.result} />}
        </div>
      )}
    </div>
  );
};

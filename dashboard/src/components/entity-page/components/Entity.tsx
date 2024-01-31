import { TypeName, parseTypedData } from "event-processing";
import { FeaturePathItem } from "../../../shared/types";
import { api } from "../../../utils/api";
import { useComponentConfig } from "../useComponentConfig";
import { ComponentType } from "./_enum";
import { EntityPageComponent } from "./types";
import { isEditModeAtom } from "../state";
import { useAtom } from "jotai";
import { RenderResult, RenderTypedData } from "../../RenderResult";
import { FeatureSelector } from "../FeatureSelector";

export type EntityConfig = {
  entityFeaturePath: FeaturePathItem[];
};

export const EntityComponent: EntityPageComponent<EntityConfig> = ({
  id,
  entity,
}) => {
  // Component implementation
  const [isEditMode] = useAtom(isEditModeAtom);

  const [config, setConfig] = useComponentConfig<ComponentType.Entity>(id);

  const { data: entFeature } = api.features.getValue.useQuery(
    {
      entity,
      featurePath: config.config.entityFeaturePath,
    },
    {
      enabled: !!config.config.entityFeaturePath.length,
    }
  );

  const entityObject =
    entFeature?.result.type === "success"
      ? parseTypedData(
          {
            type: TypeName.Entity,
          },
          entFeature.result.data
        )
      : null;

  const { data: entityDataRows } = api.lists.getEntitiesList.useQuery({
    entityFilters: { entityId: entity.id, entityType: entity.type },
  });

  return (
    <div>
      {isEditMode ? (
        <div>
          <FeatureSelector
            desiredSchema={{ type: TypeName.Entity }}
            baseEntityTypeId={entity.type}
            value={config.config.entityFeaturePath}
            onChange={(value) => {
              setConfig({
                ...config,
                config: {
                  entityFeaturePath: value,
                },
              });
            }}
          />
          <pre>{JSON.stringify(entFeature, null, 2)}</pre>
        </div>
      ) : (
        <div>
          {entFeature && (
            <>
              <RenderResult result={entFeature.result} />
            </>
          )}
        </div>
      )}
    </div>
  );
};

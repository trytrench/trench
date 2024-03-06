import { TypeName, parseTypedData } from "event-processing";
import { api } from "../../../utils/api";
import { ComponentType } from "./_enum";
import { EntityPageComponent } from "./types";
import { isEditModeAtom } from "../state";
import { useAtom } from "jotai";
import { RenderResult, RenderTypedData } from "../../RenderResult";
import { FeatureSelector } from "../FeatureSelector";

export type EntityConfig = {
  entityFeaturePath: string[];
};

export const EntityComponent: EntityPageComponent<EntityConfig> = ({
  id,
  entity,
  config,
  setConfig,
}) => {
  // Component implementation
  const [isEditMode] = useAtom(isEditModeAtom);

  const { data: entFeature } = api.features.getValue.useQuery(
    {
      entity,
      featurePath: config.entityFeaturePath,
    },
    {
      enabled: !!config.entityFeaturePath.length,
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

  return (
    <div>
      {isEditMode ? (
        <div>
          <FeatureSelector
            desiredSchema={{ type: TypeName.Entity }}
            baseEntityTypeId={entity.type}
            value={config.entityFeaturePath}
            onChange={(value) => {
              setConfig({
                entityFeaturePath: value,
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

import { useEntity } from "../context/EntityContext";
import { EntityPageComponent } from "./types";

export interface EntityConfig {
  entityFeatureId: string | null;
}

export const EntityComponent: EntityPageComponent<EntityConfig> = ({
  config,
}) => {
  // Component implementation
  const { entityType, entityId } = useEntity();
  return (
    <div>
      <div>
        {entityType} {entityId}
      </div>
    </div>
  );
};

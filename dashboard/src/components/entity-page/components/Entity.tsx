import { EntityPageComponent } from "./types";

export interface EntityConfig {
  entityFeatureId: string | null;
}

export const EntityComponent: EntityPageComponent<EntityConfig> = ({
  config,
}) => {
  // Component implementation
  return (
    <div>
      <div>ENTITY</div>
    </div>
  );
};

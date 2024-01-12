import { api } from "../../../utils/api";
import { useEntity } from "../context/EntityContext";
import { EntityPageComponent } from "./types";

export type EntityConfig = object;

export const EntityComponent: EntityPageComponent<EntityConfig> = ({
  config,
}) => {
  // Component implementation
  const { entityType, entityId } = useEntity();

  const { data: entityDataRows } = api.lists.getEntitiesList.useQuery(
    { entityFilters: { entityId, entityType } },
    { enabled: !!entityId && !!entityType }
  );

  return (
    <div>
      <div>
        {entityType} {entityId}
      </div>
    </div>
  );
};

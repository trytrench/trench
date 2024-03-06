import { useMemo, useState } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/components/ui/hover-card";
import { api } from "~/utils/api";
import { FeatureGrid } from "./FeatureGrid";
import { format } from "date-fns";
import { useEntityNameMap } from "~/hooks/useEntityNameMap";
import { TypeName } from "event-processing";
import { useEntityName } from "~/hooks/useEntityName";
import { type FeatureSuccess } from "../shared/types";
import { EntityFilter, EntityFilterType } from "../shared/validation";

interface Props {
  entityId: string;
  entityType: string;
  children: React.ReactNode;
}

export const EntityHoverCard = ({ entityId, entityType, children }: Props) => {
  const [open, setOpen] = useState(false);

  const filters = useMemo(() => {
    const arr: EntityFilter[] = [];
    arr.push({
      type: EntityFilterType.EntityId,
      data: entityId,
    });
    arr.push({
      type: EntityFilterType.EntityType,
      data: entityType,
    });
    return arr;
  }, [entityId, entityType]);
  const { data } = api.lists.getEntitiesList.useQuery(
    { entityFilters: filters },
    { enabled: !!entityId && open }
  );

  const entity = useMemo(() => data?.rows[0], [data]);
  const { entityName, entityTypeName } = useEntityName(entity);

  const entityIds = useMemo<string[]>(() => {
    return (
      entity?.features
        .filter(
          (feature) =>
            feature.result.type === "success" &&
            feature.result.data.schema.type === TypeName.Entity
        )
        .map((feature) => {
          const data = (feature.result as FeatureSuccess).data;
          return `${data.value.type}_${data.value.id}`;
        }) ?? []
    );
  }, [entity]);
  const entityNameMap = useEntityNameMap(entityIds);

  return (
    <HoverCard
      openDelay={100}
      closeDelay={0}
      onOpenChange={setOpen}
      open={open}
    >
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-[400px]">
        {entity ? (
          <>
            <div className="font-semibold text-emphasis-foreground truncate">
              {entityTypeName}: {entityName ?? entity.entityId}
            </div>
            <div className="text-xs">
              Last seen: {format(entity.lastSeenAt, "yyyy-MM-dd HH:mm:ss")}
            </div>

            <div className="h-1"></div>

            <FeatureGrid
              features={entity.features}
              entityNameMap={entityNameMap}
              cols={2}
            />
          </>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  );
};

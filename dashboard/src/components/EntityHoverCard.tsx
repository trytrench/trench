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

interface Props {
  entityId: string;
  entityType: string;
  children: React.ReactNode;
}

export const EntityHoverCard = ({ entityId, entityType, children }: Props) => {
  const [open, setOpen] = useState(false);

  const { data } = api.lists.getEntitiesList.useQuery(
    { entityFilters: { entityId, entityType } },
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
        .map((feature) => feature.result.data.value.id) ?? []
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
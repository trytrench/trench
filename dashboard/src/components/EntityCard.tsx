import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { useDecision } from "~/hooks/useDecision";
import { useEntityName } from "~/hooks/useEntityName";
import { api, type RouterOutputs } from "~/utils/api";
import { FeatureGrid } from "./FeatureGrid";
import { RenderDecision } from "./RenderDecision";
import { customEncodeURIComponent } from "../lib/uri";

interface Props {
  entity: RouterOutputs["lists"]["getEntitiesList"]["rows"][number];
  relation?: string;
  entityNameMap: Record<string, string>;
}

export const EntityCard = ({ entity, relation, entityNameMap }: Props) => {
  const decision = useDecision(entity.features);
  const { data: entityTypes } = api.entityTypes.list.useQuery();
  const entityTypeName = entityTypes?.find((et) => et.id === entity.entityType)
    ?.type;

  return (
    <a
      className="flex flex-col text-left border rounded-lg shadow-sm p-8 bg-card"
      href={`/entity/${customEncodeURIComponent(
        entityTypeName
      )}/${customEncodeURIComponent(entity.entityId)}`}
    >
      <div className="">
        <Link
          href={`/entity/${customEncodeURIComponent(
            entityTypeName
          )}/${customEncodeURIComponent(entity.entityId)}`}
        >
          <div className="flex items-center">
            <h1 className="text-lg text-emphasis-foreground">
              {entityTypeName}: {entity.entityName ?? entity.entityId}
            </h1>
            {relation && <Badge className="ml-2 self-center">{relation}</Badge>}

            <div className="ml-3">
              {decision && <RenderDecision decision={decision} />}
            </div>
          </div>
        </Link>
        {/* {entity.firstSeenAt && (
          <div className="text-muted-foreground text-sm">
            First seen:{" "}
            {format(new Date(entity.firstSeenAt), "MMM d, yyyy h:mm a")}
          </div>
        )} */}
        {entity.lastSeenAt && (
          <div className="text-muted-foreground text-sm">
            Last seen:{" "}
            {format(new Date(entity.lastSeenAt), "MMM d, yyyy h:mm a")}
          </div>
        )}

        <div className="h-4"></div>

        <FeatureGrid features={entity.features} entityNameMap={entityNameMap} />
      </div>
    </a>
  );
};

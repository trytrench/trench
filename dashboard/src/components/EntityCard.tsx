import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { api, type RouterOutputs } from "~/utils/api";
import { FeatureGrid } from "./FeatureGrid";
import { useEntityName } from "~/hooks/useEntityName";

interface Props {
  entity: RouterOutputs["lists"]["getEntitiesList"]["rows"][number];
  relation?: string;
  entityNameMap: Record<string, string>;
}

export const EntityCard = ({ entity, relation, entityNameMap }: Props) => {
  const { entityName, entityTypeName } = useEntityName(entity);

  return (
    <a
      className="flex flex-col text-left border rounded-lg shadow-sm p-8 bg-card"
      href={`/entity/${encodeURIComponent(
        entity.entityType
      )}/${encodeURIComponent(entity.entityId)}`}
    >
      <div className="">
        <Link
          href={`/entity/${encodeURIComponent(
            entity.entityType
          )}/${encodeURIComponent(entity.entityId)}`}
        >
          <div className="flex">
            <h1 className="text-lg text-emphasis-foreground">
              {entityTypeName}: {entityName ?? entity.entityId}
            </h1>
            {relation && <Badge className="ml-2 self-center">{relation}</Badge>}
          </div>
        </Link>
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

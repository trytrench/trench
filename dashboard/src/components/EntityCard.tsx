import { Badge } from "~/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import { type RouterOutputs } from "~/utils/api";

interface Props {
  entity: RouterOutputs["lists"]["getEntitiesList"]["rows"][number];
  relation?: string;
  datasetId: string;
}

export const EntityCard = ({ entity, relation, datasetId }: Props) => {
  const entityFeatures = entity.features ?? {};

  const entityLabels = entity.labels.filter((v) => v !== "") ?? [];

  return (
    <div className="border rounded-lg shadow-sm p-8 bg-card">
      <div className="">
        <Link href={`/datasets/${datasetId}/entity/${entity.id}`}>
          <div className="flex">
            <h1 className="text-lg">
              {entity.type}: {entity.name}
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
        <div className="flex flex-wrap gap-1 mt-3">
          {entityLabels.length > 0 ? (
            entityLabels.map((label) => {
              return (
                <Badge key={label} variant="default">
                  {label}
                </Badge>
              );
            })
          ) : (
            <Badge variant="outline">No labels</Badge>
          )}
        </div>
        <div className="h-4"></div>
        <div className="grid grid-cols-5 gap-x-8 gap-y-4 text-sm text-secondary-foreground">
          {Object.entries(entityFeatures).map(([key, value], idx) => (
            <div key={key}>
              <div className="font-semibold">{key}</div>
              <div className="truncate">
                {value === 0
                  ? "0"
                  : value === true
                  ? "True"
                  : value === false
                  ? "False"
                  : (value as string) || "-"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import { Badge } from "~/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import { type RouterOutputs } from "~/utils/api";
import { EntityChip } from "./EntityChip";
import { useRouter } from "next/router";

interface Props {
  entity: RouterOutputs["lists"]["getEntitiesList"]["rows"][number];
  relation?: string;
  href: string;
}

export const EntityCard = ({
  entity,
  relation,
  href,
  features,
  rules,
  name,
  datasetId,
}: Props) => {
  const router = useRouter();

  return (
    <div className="border rounded-lg shadow-sm p-8 bg-card">
      <div className="">
        <Link href={href}>
          <div className="flex">
            <h1 className="text-lg text-emphasis-foreground">
              {entity.type}: {name}
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
          {/* {entityLabels.length > 0 ? (
            entityLabels.map((label) => {
              return (
                <Badge key={label} variant="default">
                  {label}
                </Badge>
              );
            })
          ) : (
            <div className="italic text-sm">No labels</div>
          )} */}
        </div>
        <div className="h-2"></div>
        {rules.length > 0 && (
          <div className="grid grid-cols-5 gap-x-8 gap-y-4 text-sm text-foreground mb-4">
            {rules.map(({ name, color }) => (
              <div key={name} className="flex space-x-1 items-center">
                <div
                  className={`rounded-full ${color || "bg-gray-400"} w-2 h-2`}
                ></div>
                <div className="font-semibold">{name}</div>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-5 gap-x-8 gap-y-4 text-sm text-foreground">
          {features.map(({ name, value, dataType, entityName, entityType }) => (
            <div key={name}>
              <div className="font-semibold">{name}</div>

              {dataType === "entity" && value ? (
                <EntityChip
                  entity={{ id: value, name: entityName, type: entityType }}
                  href={`/${router.query.project as string}/entity/${value}`}
                  datasetId={datasetId}
                />
              ) : (
                <div className="truncate">
                  {value === 0
                    ? "0"
                    : value === true
                    ? "True"
                    : value === false
                    ? "False"
                    : (JSON.stringify(value) as string) || "-"}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import { Badge } from "~/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import { type RouterOutputs } from "~/utils/api";
import { LabelList } from "./ui/custom/label-list";
import { FeatureGrid } from "./ui/custom/feature-grid";

interface Props {
  entity: RouterOutputs["lists"]["getEntitiesList"]["rows"][number];
  relation?: string;
  href: string;
}

export const EntityCard = ({ entity, relation, href }: Props) => {
  return (
    <div className="border rounded-lg shadow-sm p-8 bg-card">
      <div className="">
        <Link href={href}>
          <div className="flex">
            <h1 className="text-lg text-emphasis-foreground">
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

        <LabelList labels={entity.labels} className="mt-3" />

        <div className="h-4"></div>

        <FeatureGrid features={entity.features} />
      </div>
    </div>
  );
};

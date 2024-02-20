import { BoxIcon, ExternalLink } from "lucide-react";
import { EntityHoverCard } from "./EntityHoverCard";

interface Props {
  href?: string;
  name: string;
  entityId: string;
  entityType: string;
}

export const EntityChip = ({ entityId, entityType, href, name }: Props) => {
  return (
    <EntityHoverCard entityId={entityId} entityType={entityType}>
      <a
        href={href}
        className="rounded-full p-1 px-3 flex space-x-1 items-center border bg-card hover:bg-muted active:bg-accent drop-shadow-sm cursor-pointer"
      >
        <BoxIcon className="w-4 h-4 shrink-0" />
        <div className="truncate font-semibold">{name}</div>
      </a>
    </EntityHoverCard>
  );
};

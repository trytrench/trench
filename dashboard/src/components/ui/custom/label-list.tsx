import { cn } from "~/lib/utils";
import { Badge } from "../badge";

interface LabelListProps {
  labels?: string[];
  onLabelClick?: (label: string) => void;
  className?: string;
  showPlaceholder?: boolean;
}

export function LabelList({
  labels,
  onLabelClick,
  className,
  showPlaceholder = true,
}: LabelListProps) {
  const hasLabels = labels && labels.length > 0;
  const filteredLabels = labels?.filter((v) => v !== "") ?? [];

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {hasLabels
        ? filteredLabels.map((label) => (
            <Badge key={label} onClick={() => onLabelClick?.(label)}>
              <span className="text-xs">{label}</span>
            </Badge>
          ))
        : showPlaceholder && <Badge variant="outline">No Labels</Badge>}
    </div>
  );
}

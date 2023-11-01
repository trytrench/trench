import { cn } from "~/lib/utils";

interface FeatureGridProps {
  features: Record<string, any>;
  cols?: number;
  className?: string;
  placeholderClassName?: string;
}

export function FeatureGrid({
  features,
  cols,
  className,
  placeholderClassName,
}: FeatureGridProps) {
  const hasFeatures = features && Object.keys(features).length > 0;

  const colsCn = cols ? `grid-cols-${cols}` : "grid-cols-5";

  if (!hasFeatures) {
    return (
      <div
        className={cn(
          "text-sm italic text-muted-foreground",
          placeholderClassName
        )}
      >
        No Features
      </div>
    );
  }

  return (
    <div className={cn("grid gap-x-8 gap-y-4 text-sm", colsCn, className)}>
      {Object.entries(features).map(([key, value]) => (
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
  );
}

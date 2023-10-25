import { cn } from "~/lib/utils";

type PanelProps = React.HTMLAttributes<HTMLDivElement>;

function Panel({ className, ...props }: PanelProps) {
  return (
    <div
      className={cn("border rounded-lg p-8 bg-card shadow-sm", className)}
      {...props}
    />
  );
}

export { Panel };

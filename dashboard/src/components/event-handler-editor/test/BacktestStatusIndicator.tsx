import { Check, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "../../../lib/utils";

export function BacktestStatusIndicator(props: { isActive: boolean }) {
  const { isActive } = props;

  const Icon = isActive ? Loader2 : Check;

  return (
    <div className="flex items-centr">
      <Icon
        className={cn({
          "h-4 w-4": true,
          "animate-spin": isActive,
          "text-green-700": !isActive,
        })}
      />
      <span className="ml-1">{isActive ? "Running" : "Completed"}</span>
    </div>
  );
}

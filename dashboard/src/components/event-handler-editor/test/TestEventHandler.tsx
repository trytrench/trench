import { useMemo } from "react";
import { useAtom } from "jotai";
import { compileStatusAtom } from "../../../global-state/editor";
import { Separator } from "../../ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../ui/custom/light-tabs";
import { InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";
import { RenderCodeHash } from "../RenderCodeHash";
import { Backtest } from "./Backtest";

export function TestEventHandler() {
  const [compileStatus] = useAtom(compileStatusAtom);

  const features = useMemo(() => {
    if (compileStatus.status !== "success") {
      return null;
    }

    return Object.values(compileStatus.compiledExecutable.getFeatureDocs());
  }, [compileStatus]);

  if (compileStatus.status !== "success") {
    return null;
  }

  return (
    <div className="flex h-full w-full">
      <Backtest />
    </div>
  );
}

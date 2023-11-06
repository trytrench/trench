import { useMemo } from "react";
import { useAtom } from "jotai";
import { compileStatusAtom } from "../../global-state/editor";
import { Separator } from "../ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/custom/light-tabs";
import { InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { RenderCodeHash } from "./RenderCodeHash";
import { Backtest } from "./Backtest";

export function EventHandlerPreviewTest() {
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
    <div className="flex w-full">
      <div className="flex-[2]">
        <div className="h-8"></div>
        <div className="flex justify-between items-center px-8">
          <div className="text-lg font-bold">Preview</div>
          <div className="flex items-center">
            <RenderCodeHash hashHex={compileStatus.codeHash} />
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger>
                  <InfoIcon className="h-4 w-4 ml-3" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Whenever you change your code in the Edit Code tab, this
                    hash will change as well.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="h-4"></div>
        <Tabs className="px-5" defaultValue="features">
          <TabsList>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="entities">Entities</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="backtests">Decisions</TabsTrigger>
          </TabsList>
          <TabsContent value="features" className="p-3">
            <div className="font-mono text-sm">
              {features?.map((feature) => {
                return (
                  <div key={feature.name}>
                    <div className="text-foreground">
                      {feature.name} - {feature.definitions[0]?.filename}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      {/* <div className="w-6 shrink-0 bg-white"></div> */}
      <Separator orientation="vertical" />
      <Backtest />
    </div>
  );
}

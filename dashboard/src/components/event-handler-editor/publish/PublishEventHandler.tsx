import { ArrowRight, ChevronDown, FileText, Upload } from "lucide-react";
import { Panel } from "../../ui/custom/panel";
import { EventHandler } from "../types";
import { useState } from "react";
import { SelectEventHandlerPopup } from "../SelectEventHandlerPopup";
import { EventHandlerLabel } from "../EventHandlerLabel";
import { formatRelative } from "date-fns";
import { cn } from "../../../lib/utils";
import { RenderCodeHash } from "../RenderCodeHash";
import { api } from "../../../utils/api";
import { useProject } from "../../../hooks/useProject";
import { Button } from "../../ui/button";
import { PublishDialog } from "./PublishDialog";
import { PublishTable } from "./PublishTable";

export function PublishEventHandler() {
  const [newEventHandler, setNewEventHandler] = useState<
    EventHandler | undefined
  >();

  const { data: project, refetch: refetchProject } = useProject();
  const { data: productionDatasetData } = api.datasets.get.useQuery(
    { id: project!.productionDatasetId! },
    { enabled: !!project?.productionDatasetId }
  );

  const prodEventHandler =
    productionDatasetData?.currentEventHandlerAssignment?.eventHandler;

  if (!prodEventHandler) {
    return null;
  }

  return (
    <div>
      <div className="p-4">
        <div className="flex items-center">
          <div className="flex-1">
            <h1 className="text-lg">Current Production Code</h1>
          </div>
          <div className="w-20"></div>
          <div className="flex-1 flex items-center justify-between">
            <h1 className="text-lg">New Code</h1>
            <div>
              <PublishDialog
                originalEventHandler={prodEventHandler}
                newEventHandler={newEventHandler}
                renderTrigger={() => {
                  return (
                    <Button
                      disabled={
                        !newEventHandler ||
                        newEventHandler.hash === prodEventHandler.hash
                      }
                    >
                      <Upload className="-ml-1.5 mr-1.5 h-4 w-4" />
                      Publish
                    </Button>
                  );
                }}
              />
            </div>
          </div>
        </div>
        <div className="h-6"></div>
        <div className="flex items-stretch">
          <div className="flex-1 min-w-0">
            <div className="px-3 py-2 flex items-center h-20 border rounded-md">
              <FileText className="h-6 w-6 mr-3" />
              <div className="flex-1 min-w-0 flex flex-col items-start">
                <div className="w-full flex whitespace-nowrap items-center">
                  <RenderCodeHash hashHex={prodEventHandler.hash} size="sm" />
                  <span className="ml-1 mb-0.5">
                    {prodEventHandler.message}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  created{" "}
                  {formatRelative(
                    new Date(prodEventHandler.createdAt),
                    new Date()
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="w-20 flex justify-center items-center">
            <ArrowRight className="h-6 w-6"></ArrowRight>
          </div>
          <div className="flex-1 min-w-0">
            <SelectEventHandlerPopup
              value={newEventHandler}
              onSelect={setNewEventHandler}
              renderTrigger={({ selectedEventHandler }) => {
                if (!selectedEventHandler) {
                  return (
                    <button className="h-20 p-3 w-full flex items-center justify-center border rounded-md hover:bg-secondary data-[state=open]:bg-secondary transition">
                      <span className="font-bold">Select code to publish</span>
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </button>
                  );
                }
                return (
                  <button
                    className={cn({
                      "w-full px-3 py-2 flex items-center h-20 border rounded-md hover:bg-secondary data-[state=open]:bg-secondary min-w-0":
                        true,
                    })}
                  >
                    <FileText className="h-6 w-6 mr-3 shrink-0" />
                    <div className="flex-1 min-w-0 flex flex-col items-start">
                      <div className="w-full flex whitespace-nowrap items-center">
                        <RenderCodeHash
                          hashHex={selectedEventHandler.hash}
                          size="sm"
                        />
                        <span className="ml-1 mb-0.5 truncate">
                          {selectedEventHandler.message}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        created{" "}
                        {formatRelative(
                          new Date(selectedEventHandler.createdAt),
                          new Date()
                        )}
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-6 pl-2 ml-auto" />
                  </button>
                );
              }}
            />
          </div>
        </div>
        <div className="h-8"></div>
      </div>

      <h1 className="text-lg p-4">Backtests</h1>
      <PublishTable />
    </div>
  );
}

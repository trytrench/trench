import { formatDistance, formatRelative } from "date-fns";
import { RenderCodeHash } from "./RenderCodeHash";
import { api } from "../../utils/api";
import { useProject } from "../../hooks/useProject";
import { Tabs, TabsList, TabsTrigger } from "../ui/custom/light-tabs";
import { TabsContent } from "../ui/tabs";
import { cn } from "../../lib/utils";
import { EventHandlerLabel } from "./EventHandlerLabel";
import { type EventHandler } from "./types";
import { FileText, LucideIcon, Upload } from "lucide-react";

export function SelectEventHandler(props: {
  value: EventHandler | undefined;
  onSelect: (id: EventHandler) => void;
}) {
  const { value, onSelect } = props;

  const { data: project } = useProject();
  const { data: savedEventHandlers } = api.eventHandlers.list.useQuery(
    { projectId: project!.id },
    { enabled: !!project }
  );

  const { data: releasedEventHandlers } =
    api.eventHandlers.listByReleases.useQuery(
      { projectId: project!.id },
      { enabled: !!project }
    );

  return (
    <Tabs defaultValue="saved" className="w-96">
      <TabsList className="flex justify-center">
        <TabsTrigger value="saved">Saved Snapshots</TabsTrigger>
        <TabsTrigger value="releases">Releases</TabsTrigger>
      </TabsList>
      <TabsContent value="saved">
        {savedEventHandlers?.map((evHandler) => {
          const selected = false;

          return (
            <button
              key={evHandler.id}
              className={cn({
                "w-full px-3 py-2 flex items-center overflow-hidden": true,
                "hover:bg-accent/50": !selected,
                "bg-accent": selected,
              })}
              onClick={() => {
                onSelect?.(evHandler);
              }}
            >
              <FileText className="h-4 w-4 mr-3 shrink-0" />
              <div className="flex-1 min-w-0 flex flex-col items-start">
                <div className="w-full">
                  <EventHandlerLabel
                    key={evHandler.id}
                    eventHandler={evHandler}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  saved{" "}
                  {formatRelative(new Date(evHandler.createdAt), new Date())}
                  {/* {formatDistance(evHandler.createdAt, Date.now(), {
                    addSuffix: true,
                  })}{" "} */}
                </div>
              </div>
            </button>
          );
        })}
      </TabsContent>
      <TabsContent value="releases">
        {releasedEventHandlers?.map((release) => {
          const { eventHandler: evHandler, releasedAt } = release;

          const selected = false;
          return (
            <button
              key={evHandler.id}
              className={cn({
                "w-full px-3 py-2 flex items-center": true,
                "hover:bg-accent/50": !selected,
                "bg-accent": selected,
              })}
              onClick={() => {
                onSelect?.(evHandler);
              }}
            >
              <Upload className="h-4 w-4 mr-3" />
              <div className="flex-1 min-w-0 flex flex-col items-start overflow-hidden">
                <EventHandlerLabel
                  key={evHandler.id}
                  eventHandler={evHandler}
                />
                <div className="text-xs text-muted-foreground">
                  released{" "}
                  {formatRelative(new Date(evHandler.createdAt), new Date())}
                  {/* {formatDistance(releasedAt, Date.now(), {
                    addSuffix: true,
                  })}{" "} */}
                </div>
              </div>
            </button>
          );
        })}
      </TabsContent>
    </Tabs>
  );
}

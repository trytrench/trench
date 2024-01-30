import { usePrevious } from "@dnd-kit/utilities";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { Navbar } from "~/components/Navbar";
import {
  selectors,
  useEditorStore,
} from "~/components/nodes/editor/state/zustand";
import { Button } from "~/components/ui/button";
import { type NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";
import { EventEditor } from "./event-types/[eventType]/EventEditor";
import { FnType, hasFnType } from "event-processing";
import { useMutationToasts } from "~/components/nodes/editor/useMutationToasts";
import { handleError } from "~/lib/handleError";

const Page: NextPageWithLayout = () => {
  const { data: eventTypes } = api.eventTypes.list.useQuery();

  const [selectedEventType, setSelectedEventType] = useState<string | null>();

  const { data: nodeDefs } = api.nodeDefs.list.useQuery();

  const { mutateAsync: publish } = api.editor.saveNewEngine.useMutation();
  const nodes = useEditorStore(selectors.getNodeDefs());

  const { data: engineData } = api.editor.getLatestEngine.useQuery();
  const prevEngineId = usePrevious(engineData?.engineId);
  const initialize = useEditorStore.use.initializeFromNodeDefs();

  useEffect(() => {
    if (nodeDefs && engineData && engineData?.engineId !== prevEngineId) {
      initialize([
        ...engineData.nodeDefs,
        // Always include event nodes
        ...nodeDefs.filter((n) => hasFnType(n, FnType.Event)),
      ]);
    }
  }, [nodeDefs, engineData, initialize, prevEngineId]);

  useEffect(() => {
    if (eventTypes?.[0]) {
      setSelectedEventType(eventTypes[0].id);
    }
  }, [eventTypes]);

  const toasts = useMutationToasts();

  return (
    <div>
      <Navbar />
      <div className="border-b h-32 px-8">
        <div className="max-w-6xl mx-auto flex items-center h-full justify-between">
          <div className="text-3xl text-emphasis-foreground">Data Model</div>
          <div className="flex space-x-2">
            <Button
              onClick={() => {
                publish({
                  nodeDefs: nodes,
                })
                  .then(toasts.publish.onSuccess)
                  .catch(toasts.publish.onError)
                  .catch(handleError);
              }}
            >
              Publish
            </Button>
          </div>
        </div>
      </div>
      <div className="px-8">
        <div className="flex max-w-6xl mx-auto pt-6">
          <div className="w-64 pr-8">
            {eventTypes?.map((eventType) => (
              <div
                className={clsx(
                  "px-4 py-1 w-full text-sm font text-muted-foreground text-left rounded-md transition flex gap-2 items-center hover:bg-muted",
                  {
                    "bg-accent text-accent-foreground":
                      selectedEventType === eventType.id,
                  }
                )}
                onClick={() => setSelectedEventType(eventType.id)}
                key={eventType.id}
              >
                {eventType.id}
              </div>
            ))}
          </div>
          <div className="flex-1">
            {selectedEventType && (
              <EventEditor
                key={selectedEventType}
                eventType={selectedEventType}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;

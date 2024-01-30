import { usePrevious } from "@dnd-kit/utilities";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "~/components/Navbar";
import {
  selectors,
  useEditorStore,
} from "~/components/nodes/editor/state/zustand";
import { Button } from "~/components/ui/button";
import { type NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";
import { EventEditor } from "../../components/nodes/editor/EventEditor";
import { FnType, TSchema } from "event-processing";
import { generateNanoId } from "../../../../packages/common/src";
import { useMutationToasts } from "../../components/nodes/editor/useMutationToasts";
import { handleError } from "~/lib/handleError";
import { EditNodeSheet } from "../../components/nodes/editor/EditNodeSheet";

const Page: NextPageWithLayout = () => {
  const eventNodes = useEditorStore(
    selectors.getNodeDefs({ fnType: FnType.Event })
  );
  const createNodeWithFn = useEditorStore.use.setNodeDefWithFn();

  const [selectedEventType, setSelectedEventType] = useState<string | null>();

  const { data: eventTypes } = api.eventTypes.list.useQuery();

  const { mutateAsync: publish } = api.editor.saveNewEngine.useMutation();
  const nodes = useEditorStore(selectors.getNodeDefs());

  const { data: engineData } = api.editor.getLatestEngine.useQuery();
  const prevEngineId = usePrevious(engineData?.engineId);
  const initialize = useEditorStore.use.initializeFromNodeDefs();

  useEffect(() => {
    if (engineData && engineData?.engineId !== prevEngineId) {
      initialize(engineData.nodeDefs);
    }
  }, [engineData, initialize, prevEngineId]);

  useEffect(() => {
    if (eventNodes?.[0] && !selectedEventType) {
      setSelectedEventType(eventNodes[0].eventType);
    }
  }, [eventNodes, selectedEventType]);

  const filteredEventTypes = useMemo(() => {
    const existingEventTypes = new Set(
      eventNodes?.map((node) => node.eventType) ?? []
    );
    return (
      eventTypes?.filter(
        (eventType) => !existingEventTypes.has(eventType.id)
      ) ?? []
    );
  }, [eventNodes, eventTypes]);

  const toasts = useMutationToasts();

  return (
    <div>
      <Navbar />
      <div className="border-b h-32">
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
      <div className="flex max-w-6xl mx-auto pt-6">
        <div className="w-64 pr-8">
          <div className="text-lg font-medium">Event Types</div>
          <div className="h-2"></div>
          {eventNodes?.map((node) => (
            <div
              className={clsx(
                "px-4 py-1 w-full text-sm font text-muted-foreground text-left rounded-md transition flex gap-2 items-center",
                {
                  "bg-accent text-accent-foreground":
                    selectedEventType === node.eventType,
                  "hover:bg-muted cursor-pointer":
                    selectedEventType !== node.eventType,
                }
              )}
              onClick={() => setSelectedEventType(node.eventType)}
              key={node.eventType}
            >
              {node.eventType}
            </div>
          ))}
          <div className="h-4"></div>
          <div className="text-lg font-medium">Add</div>
          <div className="h-2"></div>
          {filteredEventTypes?.map((eventType) => (
            <div
              className={clsx(
                "px-4 py-1 w-full text-sm font text-muted-foreground text-left rounded-md transition flex gap-2 items-center hover:bg-muted cursor-pointer",
                {
                  "bg-accent text-accent-foreground":
                    selectedEventType === eventType.id,
                }
              )}
              onClick={() => {
                setSelectedEventType(eventType.id);

                createNodeWithFn(FnType.Event, {
                  id: generateNanoId(),
                  name: `Event type: ${eventType.id}`,
                  fn: {
                    id: generateNanoId(),
                    name: `Event type: ${eventType.id}`,
                    type: FnType.Event,
                    config: {},
                    returnSchema: eventType.exampleSchema as unknown as TSchema,
                  },
                  eventType: eventType.id,
                  inputs: {},
                })
                  .then(toasts.createNode.onSuccess)
                  .catch(toasts.createNode.onError)
                  .catch(handleError);
              }}
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
        {selectedEventType && <EditNodeSheet eventType={selectedEventType} />}
      </div>
    </div>
  );
};

export default Page;

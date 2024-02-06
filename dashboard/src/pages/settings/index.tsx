import { usePrevious } from "@dnd-kit/utilities";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navbar } from "~/components/Navbar";
import {
  Engine,
  EngineCompileStatus,
  selectors,
  useEditorStore,
} from "~/components/nodes/editor/state/zustand";
import { Button } from "~/components/ui/button";
import { type NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";
import { EventEditor } from "../../components/nodes/editor/EventEditor";
import {
  FnType,
  NodeDef,
  NodeDefAny,
  TSchema,
  TypeName,
} from "event-processing";
import { generateNanoId } from "../../../../packages/common/src";
import { useMutationToasts } from "../../components/nodes/editor/useMutationToasts";
import { handleError } from "~/lib/handleError";
import { EditNodeSheet } from "../../components/nodes/editor/EditNodeSheet";
import { isAfter } from "date-fns";
import { LoadingPlaceholder } from "../../components/LoadingPlaceholder";
import { Badge } from "../../components/ui/badge";
import { CheckIcon, XIcon } from "lucide-react";

function StatusIndicator(props: { status: EngineCompileStatus }) {
  const { status } = props;
  switch (status.status) {
    case "idle":
    case "compiling":
      return (
        <div className="flex items-center gap-1 text-xs text-gray-400 px-3 p-1 rounded-sm bg-gray-50">
          Compiling...
        </div>
      );
    case "error":
      const errors = status.errors;
      return (
        <div className="flex items-center gap-1 text-xs text-red-600 px-3 p-1 rounded-sm bg-red-50">
          <XIcon className="h-4 w-4 " />
          <span>{`Errors (${Object.keys(errors).length})`}</span>
        </div>
      );
    case "success":
      return (
        <div className="flex items-center gap-1 text-xs text-green-600 px-3 p-1 rounded-sm bg-green-50">
          <CheckIcon className="h-4 w-4" />
          <span>Success</span>
        </div>
      );
  }
}

const Page: NextPageWithLayout = () => {
  const eventNodes = useEditorStore(
    selectors.getNodeDefs({ fnType: FnType.Event })
  );
  const createNodeWithFn = useEditorStore.use.setNodeDefWithFn();

  const [selectedEventType, setSelectedEventType] = useState<string | null>();

  const { data: eventTypes } = api.eventTypes.list.useQuery();

  const { mutateAsync: publish } = api.editor.saveNewEngine.useMutation();
  const nodes = useEditorStore(selectors.getNodeDefs());
  const status = useEditorStore.use.status();
  const editorEngine = useEditorStore((state) => state.engine);
  const editorHasChanged = useEditorStore((state) => state.hasChanged);
  const updateErrors = useEditorStore.use.updateErrors();

  const initializeEditor = useEditorStore.use.initializeFromNodeDefs();
  const fnDefs = useEditorStore(selectors.getFnDefs());
  const setFnDef = useEditorStore.use.setFnDef();

  const { data: latestEngine } = api.editor.getLatestEngine.useQuery();

  const { data: editorEngineRemote } = api.editor.getEngine.useQuery(
    { engineId: editorEngine?.id ?? "" },
    { enabled: !!editorEngine }
  );

  // Compile every second if there are changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (status.status === "idle") {
        updateErrors();
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [status, editorHasChanged, updateErrors]);

  // Initialize if editor hasn't been initialized yet, and we have data
  useEffect(() => {
    if (latestEngine) {
      if (!editorEngine) {
        initializeEditor({
          engine: { id: latestEngine.id, createdAt: latestEngine.createdAt },
          nodeDefs: latestEngine.nodeDefs,
        });
      }
    }
  }, [editorEngine, latestEngine, initializeEditor]);

  const editorIsUpgradable = useMemo(() => {
    if (!latestEngine || !editorEngine) return false;
    return isAfter(latestEngine.createdAt, editorEngine.createdAt);
  }, [latestEngine, editorEngine]);

  /**
   * Logic:
   *
   * If there's a newer Engine ID,
   */

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

  const { data: features } = api.features.list.useQuery();

  const toasts = useMutationToasts();

  return (
    <div>
      <Navbar />
      <div className="border-b h-32 px-8">
        <div className="max-w-6xl mx-auto flex items-center h-full justify-between">
          <div className="flex items-center gap-4">
            <div className="text-3xl text-emphasis-foreground">Data Model</div>
            <Button
              onClick={() => {
                for (const fnDef of fnDefs) {
                  if (fnDef.type === FnType.LogEntityFeature) {
                    const config: any = fnDef.config;
                    const feature = features?.find(
                      (f) => f.id === config.featureId
                    );
                    if (feature && feature.name === "Name") {
                      setFnDef({
                        ...fnDef,
                        config: {
                          ...fnDef.config,
                          featureSchema: { type: TypeName.Name },
                        },
                      }).catch(handleError);
                    }
                  }
                }
              }}
            >
              Fix name loggers
            </Button>
            {editorHasChanged && (
              <Button
                onClick={() => {
                  if (editorEngineRemote) {
                    initializeEditor({
                      engine: {
                        id: editorEngineRemote.id,
                        createdAt: editorEngineRemote.createdAt,
                      },
                      nodeDefs: editorEngineRemote.nodeDefs,
                      force: true,
                    });
                  }
                }}
              >
                Reset Changes
              </Button>
            )}
            {editorIsUpgradable && (
              <Button
                onClick={() => {
                  if (latestEngine) {
                    initializeEditor({
                      engine: {
                        id: latestEngine.id,
                        createdAt: latestEngine.createdAt,
                      },
                      nodeDefs: latestEngine.nodeDefs,
                      force: true,
                    });
                  }
                }}
              >
                Upgrade
              </Button>
            )}
          </div>
          <div className="flex gap-4 items-center">
            <StatusIndicator status={status} />
            <Button
              disabled={status.status !== "success"}
              onClick={() => {
                publish({
                  nodeDefs: nodes,
                })
                  .then((res) => {
                    initializeEditor({
                      engine: {
                        id: res.engine.id,
                        createdAt: res.engine.createdAt,
                      },
                      nodeDefs: res.engine.nodeDefs,
                      force: true,
                    });
                    return res;
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

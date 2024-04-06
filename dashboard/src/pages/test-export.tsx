import { FnDefAny, FnType, NodeDef, NodeDefAny } from "event-processing";
import { cn } from "../lib/utils";
import { api } from "../utils/api";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { compact, isNull, mapValues, omit, omitBy } from "lodash";
import {
  selectors,
  useEditorStore,
} from "../components/nodes/editor/state/zustand";
import { RenderNodeDefs } from "../components/RenderNodeDefs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import ReactMarkdown from "react-markdown";
import { Panel } from "reactflow";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";

function ExportEntity() {
  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const { data: features } = api.features.list.useQuery();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedEntityType = entityTypes?.find((et) => et.id === selectedId);

  const filteredFeatures = features
    ?.filter((feature) => {
      return feature.entityTypeId === selectedId;
    })
    .map((feature) => {
      return {
        id: feature.id,
        name: feature.name,
        schema: feature.schema,
      };
    });

  return (
    <div className="flex">
      <div className="flex flex-col">
        {entityTypes?.map((entityType) => {
          return (
            <button
              className={cn({
                border: true,
                "border-black": selectedId === entityType.id,
                "border-transparent": selectedId !== entityType.id,
              })}
              key={entityType.id}
              onClick={() => {
                setSelectedId(entityType.id);
              }}
            >
              {entityType.type}
            </button>
          );
        })}
      </div>

      <div>
        <pre className="text-xs">
          {JSON.stringify(
            {
              entityType: selectedEntityType,
              features: filteredFeatures,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}

function ExportEventHandler() {
  const { data: eventTypes } = api.eventTypes.list.useQuery();

  const [selectedEventType, setSelectedEventType] = useState<string | null>(
    null
  );

  const selectedEvent = eventTypes?.find((et) => et.id === selectedEventType);

  const nodes = useEditorStore.use.nodes();
  const fns = useEditorStore.use.fns();

  const nodeDefs = useEditorStore(
    selectors.getNodeDefs({ eventType: selectedEventType ?? "" })
  );

  const dependencies: Record<string, string[]> = useMemo(() => {
    const result: Record<string, string[]> = {};

    Object.values(nodes).forEach((node) => {
      node.dependsOn?.forEach((dep) => {
        if (!result[dep]) {
          result[dep] = [];
        }

        result[dep].push(node.id);
      });
    });

    return result;
  }, [nodes]);

  const eventHandlerSubgraph = useMemo(() => {
    const filteredNodes = omitBy(
      mapValues(nodes, (node) => {
        if (node.eventType !== selectedEventType) {
          return null;
        } else {
          return {
            ...node,
            fn: undefined,
            dependsOn: undefined,
          };
        }
      }),
      isNull
    );

    const fnIds = new Set(
      Object.values(filteredNodes).map((node) => node?.fnId)
    );

    const filteredFns = omitBy(
      mapValues(fns, (fn) => {
        if (fnIds.has(fn.id)) {
          return fn;
        } else {
          return null;
        }
      }),
      isNull
    );

    return {
      nodes: filteredNodes,
      fns: filteredFns,
    };
  }, [fns, nodes, selectedEventType]);

  return (
    <div className="flex">
      <div className="flex flex-col">
        {eventTypes?.map((eventType) => {
          return (
            <button
              className={cn({
                border: true,
                "border-black": selectedEventType === eventType.id,
                "border-transparent": selectedEventType !== eventType.id,
              })}
              key={eventType.id}
              onClick={() => {
                setSelectedEventType(eventType.id);
              }}
            >
              {eventType.id}
            </button>
          );
        })}
      </div>

      {/* <RenderNodeDefs nodeDefs={nodeDefs} /> */}

      <div>
        <Accordion type="multiple" className="w-96">
          <AccordionItem value="item-1">
            <AccordionTrigger>STuff</AccordionTrigger>
            <AccordionContent></AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Export</AccordionTrigger>
            <AccordionContent>
              <pre className="text-xs h-96 overflow-y-scroll">
                {JSON.stringify(eventHandlerSubgraph, null, 2)}
              </pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="flex items-start w-screen h-dvh ">
      <div className="p-4 bg-gray-50 flex-1">
        <ExportEntity />
      </div>
      <div className="flex-1">
        <ExportEventHandler />
      </div>
      <div className="flex-1"></div>
    </div>
  );
}

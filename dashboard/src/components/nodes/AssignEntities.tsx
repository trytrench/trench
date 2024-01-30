import { Rule } from "@prisma/client";
import clsx from "clsx";
import {
  DataPath,
  FeatureDef,
  FnType,
  NodeDef,
  TypeName,
  hasFnType,
} from "event-processing";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { api } from "~/utils/api";
import { generateNanoId } from "../../../../packages/common/src";
import { CreateEventFeatureDialog } from "./CreateEventFeatureDialog";
import { CreateFeatureDialog } from "./CreateFeatureDialog";
import { CreateRuleDialog } from "./CreateRuleDialog";
import { SelectDataPathOrEntityFeature } from "./SelectDataPathOrEntityFeature";
import { selectors, useEditorStore } from "./editor/state/zustand";
import { useMutationToasts } from "./editor/useMutationToasts";

const FeatureItem = ({
  feature,
  rule,
  dataPath,
  onDataPathChange,
  eventType,
}: {
  feature: FeatureDef;
  rule?: Rule;
  dataPath: DataPath | null;
  onDataPathChange: (dataPath: DataPath | null) => void;
  eventType: string;
}) => {
  return (
    <div key={feature.id} className="flex items-center space-x-2 h-8">
      {rule && <div className={`rounded-full ${rule.color} w-2 h-2`} />}
      <div className="font-medium text-sm">{feature.name}</div>

      <div className="text-blue-300 text-xs font-bold">
        {feature.schema.type}
      </div>

      <SelectDataPathOrEntityFeature
        value={dataPath}
        onChange={onDataPathChange}
        eventType={eventType}
        desiredSchema={feature.schema}
      />
    </div>
  );
};

const EVENT = "event";

interface Props {
  eventType: string;
}

export default function AssignEntities({ eventType }: Props) {
  const { data: features } = api.features.list.useQuery();
  const { data: rules } = api.rules.list.useQuery();

  const nodes = useEditorStore(selectors.getNodeDefs({ eventType }));

  const featureToNodeMap = useMemo(() => {
    if (!nodes) return {};
    return nodes.reduce(
      (acc, node) => {
        if (hasFnType(node, FnType.LogEntityFeature)) {
          return { ...acc, [node.fn.config.featureId]: node };
        }
        return acc;
      },
      {} as Record<string, NodeDef<FnType.LogEntityFeature>>
    );
  }, [nodes]);

  const featureToRuleMap = useMemo(() => {
    if (!rules) return {};
    return rules.reduce(
      (acc, rule) => {
        return { ...acc, [rule.featureId]: rule };
      },
      {} as Record<string, Rule>
    );
  }, [rules]);

  const [selectedNodeId, setSelectedNodeId] = useState(EVENT);

  const selectedNode = useMemo(() => {
    if (selectedNodeId === EVENT) return null;
    const foundNode = nodes?.find((node) => node.id === selectedNodeId) ?? null;

    if (!foundNode) return null;

    if (hasFnType(foundNode, FnType.EntityAppearance)) {
      return foundNode;
    } else {
      throw new Error("This node is not an entity appearance node");
    }
  }, [selectedNodeId, nodes]);

  const setNodeDef = useEditorStore.use.setNodeDefWithFn();
  const toasts = useMutationToasts();

  const filteredFeatures = useMemo(
    () =>
      features?.filter((feature) =>
        selectedNodeId === EVENT
          ? feature.eventTypeId === eventType
          : feature.entityTypeId === selectedNode?.fn.returnSchema.entityType
      ),
    [features, selectedNodeId, selectedNode, eventType]
  );

  return (
    <div>
      <Card className="flex relative">
        <div className="p-4 w-48 border-r">
          <div
            className={clsx(
              "px-4 py-1 w-full text-sm font text-muted-foreground text-left rounded-md transition flex justify-between items-center hover:bg-muted",
              { "bg-accent text-accent-foreground": selectedNodeId === EVENT }
            )}
            onClick={() => setSelectedNodeId(EVENT)}
          >
            Event
          </div>
          {nodes
            ?.filter((node) => hasFnType(node, FnType.EntityAppearance))
            .map((n) => (
              <div
                className={clsx(
                  "px-4 py-1 w-full text-sm font text-muted-foreground text-left rounded-md transition flex justify-between items-center hover:bg-muted",
                  {
                    "bg-accent text-accent-foreground": selectedNodeId === n.id,
                  }
                )}
                onClick={() => setSelectedNodeId(n.id)}
                key={n.id}
              >
                {n.name}
              </div>
            ))}
        </div>
        {selectedNodeId && (
          <div className="flex-1">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <Input className="w-[200px]" placeholder="Filter features..." />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="xs">New property</Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent>
                  <CreateRuleDialog
                    title="Create Rule"
                    entityTypeId={
                      selectedNodeId === EVENT
                        ? undefined
                        : selectedNode?.fn.returnSchema.entityType
                    }
                    eventTypeId={
                      selectedNodeId === EVENT ? eventType : undefined
                    }
                  >
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      Create rule
                    </DropdownMenuItem>
                  </CreateRuleDialog>
                  {selectedNodeId === EVENT ? (
                    <CreateEventFeatureDialog
                      title="Create event property"
                      eventType={eventType}
                    >
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        Create property
                      </DropdownMenuItem>
                    </CreateEventFeatureDialog>
                  ) : (
                    <CreateFeatureDialog
                      title="Create entity property"
                      entityTypeId={selectedNode?.fn.returnSchema.entityType}
                    >
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        Create property
                      </DropdownMenuItem>
                    </CreateFeatureDialog>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex flex-col px-6 pt-2 pb-4">
              {!filteredFeatures?.length ? (
                <div className="text-sm self-center py-8">No properties</div>
              ) : (
                filteredFeatures.map((feature) => (
                  <FeatureItem
                    feature={feature}
                    rule={featureToRuleMap[feature.id]}
                    dataPath={
                      featureToNodeMap[feature.id]?.inputs.dataPath ?? null
                    }
                    key={feature.id}
                    eventType={eventType}
                    onDataPathChange={(dataPath) => {
                      if (!dataPath) return;

                      const initialNode = featureToNodeMap[feature.id];

                      setNodeDef(FnType.LogEntityFeature, {
                        id: initialNode?.id ?? generateNanoId(),
                        name: initialNode?.name ?? feature.name,
                        eventType,
                        fn: {
                          id: initialNode?.fn.id ?? generateNanoId(),
                          name: "log entity feature",
                          type: FnType.LogEntityFeature,
                          config: {
                            featureId: feature.id,
                            featureSchema: feature.schema,
                          },
                          returnSchema: {
                            type: TypeName.Any,
                          },
                        },
                        inputs: {
                          dataPath,
                          entityDataPath: selectedNode?.inputs.dataPath,
                        },
                      })
                        // .then(toasts.createNode.onSuccess)
                        .catch(toasts.createNode.onError);
                    }}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

import clsx from "clsx";
import { FnType, NodeDef } from "event-processing";
import { MoreHorizontal } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { SchemaDisplay } from "~/components/features/SchemaDisplay";
import { CreateEntityAppearanceDialog } from "~/components/nodes/CreateEntityAppearanceDialog";
import { EditBlocklist } from "~/components/nodes/editor/EditBlocklist";
import { EditComputed } from "~/components/nodes/editor/EditComputed";
import { EditCounter } from "~/components/nodes/editor/EditCounter";
import { EditDecision } from "~/components/nodes/editor/EditDecision";
import { EditUniqueCounter } from "~/components/nodes/editor/EditUniqueCounter";
import { NodeEditorProps } from "~/components/nodes/editor/types";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "~/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Sheet, SheetContent } from "~/components/ui/sheet";
import AssignEntities from "../../../../components/nodes/AssignEntities";
import { AssignFeature } from "../../../../components/nodes/AssignFeatureDialog";
import {
  selectors,
  useEditorStore,
} from "../../../../components/nodes/editor/state/zustand";

const HIDDEN_NODE_TYPES = [
  FnType.CacheEntityFeature,
  FnType.GetEntityFeature,
  FnType.LogEntityFeature,
  // FnType.Event,
  FnType.EntityAppearance,
];

const MAP_FN_TYPE_TO_EDITOR: Partial<
  Record<FnType, React.FC<NodeEditorProps>>
> = {
  [FnType.Computed]: EditComputed,
  [FnType.Counter]: EditCounter,
  [FnType.UniqueCounter]: EditUniqueCounter,
  [FnType.Decision]: EditDecision,
  [FnType.Blocklist]: EditBlocklist,
  [FnType.Event]: () => null,
};

interface Props {
  eventType: string;
}

export function EventEditor({ eventType }: Props) {
  const nodes = useEditorStore(selectors.getNodeDefs({ eventType }));

  const [open, setOpen] = useState(false);

  const filteredNodes = useMemo(
    () => nodes?.filter((node) => !HIDDEN_NODE_TYPES.includes(node.fn.type)),
    [nodes]
  );

  const [newFnType, setNewFnType] = useState<FnType | null>(null);
  const NewNodeEditor = newFnType ? MAP_FN_TYPE_TO_EDITOR[newFnType] : null;

  const [editingNode, setEditingNode] = useState<NodeDef | null>(null);
  const EditNodeEditor = editingNode
    ? MAP_FN_TYPE_TO_EDITOR[editingNode.fn.type]
    : null;

  const [selectedNode, setSelectedNode] = useState<NodeDef | null>(null);

  useEffect(() => {
    if (!selectedNode) setSelectedNode(filteredNodes?.[0] ?? null);
  }, [selectedNode, filteredNodes]);

  return (
    <div>
      <div className="text-lg font-medium">Event Data</div>
      <div className="flex items-center my-2">
        <Input className="w-[200px]" placeholder="Filter data..." />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              role="combobox"
              className="ml-auto"
              aria-expanded={open}
            >
              Create node
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search types..." />
              <CommandEmpty>No framework found.</CommandEmpty>

              <CommandGroup>
                {[
                  { name: "Computed", type: FnType.Computed },
                  { name: "Counter", type: FnType.Counter },
                  { name: "Unique Counter", type: FnType.UniqueCounter },
                  { name: "Decision", type: FnType.Decision },
                  { name: "Blocklist", type: FnType.Blocklist },
                ].map((node) => (
                  <CommandItem
                    key={node.type}
                    onSelect={() =>
                      // void router.push(
                      //   `/settings/event-types/${
                      //     router.query.eventType as string
                      //   }/node?type=${node.type}`
                      // )
                      setNewFnType(node.type)
                    }
                  >
                    {node.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <Card className="flex h-96">
        <div className="p-4 w-80 border-r">
          {filteredNodes?.map((node) => (
            <div
              className={clsx(
                "px-4 py-1 w-full text-sm font text-muted-foreground text-left rounded-md transition flex gap-2 items-center",
                {
                  "bg-accent text-accent-foreground":
                    selectedNode?.id === node.id,
                  "hover:bg-muted cursor-pointer": selectedNode?.id !== node.id,
                }
              )}
              onClick={() => setSelectedNode(node)}
              key={node.id}
            >
              <div>{node.name}</div>

              <div className="text-blue-300 text-xs font-bold">
                {node.fn.returnSchema.type}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="iconXs" variant="link" className="h-3 ml-auto">
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => setEditingNode(node)}>
                    Edit
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
        <ScrollArea className="py-4 px-8 flex-1 text-sm">
          {selectedNode && (
            <SchemaDisplay
              name={selectedNode.name}
              schema={selectedNode.fn.returnSchema}
              path={[]}
              renderRightComponent={(dataPath) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="iconXs" variant="link" className="h-3">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent>
                    <AssignFeature
                      title="Assign Event Property"
                      defaults={{
                        dataPath: {
                          nodeId: selectedNode.id,
                          path: dataPath.path,
                          schema: dataPath.schema,
                        },
                        entityDataPath: undefined,
                        featureId: "",
                      }}
                    >
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        Assign to event
                      </DropdownMenuItem>
                    </AssignFeature>

                    <AssignFeature
                      title="Assign Entity Property"
                      defaults={{
                        dataPath: {
                          nodeId: selectedNode.id,
                          path: dataPath.path,
                          schema: dataPath.schema,
                        },
                        entityDataPath: undefined,
                        featureId: "",
                      }}
                    >
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        Assign to entity
                      </DropdownMenuItem>
                    </AssignFeature>

                    <CreateEntityAppearanceDialog
                      eventType={eventType}
                      defaults={{
                        path: {
                          nodeId: selectedNode.id,
                          path: dataPath.path,
                          schema: dataPath.schema,
                        },
                      }}
                      title="New Entity"
                    >
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        New entity
                      </DropdownMenuItem>
                    </CreateEntityAppearanceDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            />
          )}
        </ScrollArea>
      </Card>

      {/* <DataTable
        columns={columns}
        data={nodes?.filter((node) => node.type === FnType.Rule) ?? []}
      /> */}

      <div className="h-9" />
      <div className="text-lg font-medium">Properties</div>
      <div className="flex my-2 justify-between items-center">
        <Input className="w-[200px]" placeholder="Filter entities..." />

        <CreateEntityAppearanceDialog
          eventType={eventType}
          defaults={{}}
          title="New Entity"
        >
          <Button size="sm">New entity</Button>
        </CreateEntityAppearanceDialog>
      </div>
      <AssignEntities eventType={eventType} />

      {/* <Sheet
        open={!!node}
        onOpenChange={(open) => {
          if (!open) setNode(null);
        }}
      >
        <SheetContent className="sm:max-w-xl" showClose={false}>
          {node && <OtherNodeEditor initialNodeId={node.id} />}
        </SheetContent>
      </Sheet> */}

      <Sheet
        open={!!newFnType}
        onOpenChange={(open) => {
          if (!open) setNewFnType(null);
        }}
      >
        <SheetContent className="sm:max-w-xl" showClose={false}>
          {NewNodeEditor && <NewNodeEditor eventType={eventType} />}
        </SheetContent>
      </Sheet>

      <Sheet
        open={!!editingNode}
        onOpenChange={(open) => {
          if (!open) setEditingNode(null);
        }}
      >
        <SheetContent className="sm:max-w-xl" showClose={false}>
          {EditNodeEditor && (
            <EditNodeEditor
              initialNodeId={editingNode?.id}
              eventType={eventType}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

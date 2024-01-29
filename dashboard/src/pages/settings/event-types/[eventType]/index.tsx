import { zodResolver } from "@hookform/resolvers/zod";
import {
  FnType,
  NodeDef,
  TypeName,
  buildNodeDefWithFn,
  dataPathZodSchema,
} from "event-processing";
import { ChevronLeft, ChevronsUpDown, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import SettingsLayout from "~/components/SettingsLayout";
import { SchemaDisplay } from "~/components/features/SchemaDisplay";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useToast } from "~/components/ui/use-toast";
import { type NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";
import AssignEntities from "../../../../components/nodes/AssignEntities";

import clsx from "clsx";
import { EditBlocklist } from "~/components/nodes/editor/EditBlocklist";
import { EditComputed } from "~/components/nodes/editor/EditComputed";
import { EditCounter } from "~/components/nodes/editor/EditCounter";
import { EditDecision } from "~/components/nodes/editor/EditDecision";
import { EditUniqueCounter } from "~/components/nodes/editor/EditUniqueCounter";
import { NodeEditorProps } from "~/components/nodes/editor/types";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "~/components/ui/command";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Sheet, SheetContent } from "~/components/ui/sheet";
import { AssignFeature } from "../../../../components/nodes/AssignFeatureDialog";
import { SelectDataPath } from "../../../../components/nodes/SelectDataPath";
import { useMutationToasts } from "../../../../components/nodes/editor/useMutationToasts";
import { handleError } from "../../../../lib/handleError";

const HIDDEN_NODE_TYPES = [
  FnType.CacheEntityFeature,
  FnType.GetEntityFeature,
  FnType.LogEntityFeature,
  // FnType.Event,
  FnType.EntityAppearance,
];
import {
  selectors,
  useEditorStore,
} from "../../../../components/nodes/editor/state/zustand";
import { generateNanoId } from "../../../../../../packages/common/src";
import { usePrevious } from "@dnd-kit/utilities";

const formSchema = z.object({
  entityTypeId: z.string(),
  path: dataPathZodSchema,
});

type FormType = z.infer<typeof formSchema>;

function EntityDialog(props: {
  title: string;
  children: React.ReactNode;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  defaults: Partial<FormType>;
  eventType: string;
}) {
  const { title, children, onSubmit, defaults, eventType } = props;

  const [open, setOpen] = useState(false);
  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entityTypeId: "",
      path: {
        nodeId: "",
        path: [],
      },
    },
  });

  const [initializedForm, setInitializedForm] = useState(false);
  useEffect(() => {
    if (!initializedForm && defaults) {
      form.reset(defaults);
      setInitializedForm(true);
    }
  }, [defaults, form, initializedForm]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            onSubmit={form.handleSubmit((values) => {
              onSubmit(values);
              setOpen(false);
              form.reset();
            })}
          >
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <FormField
                  control={form.control}
                  name="entityTypeId"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormLabel>Entity</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an entity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {entityTypes?.map((entityType) => (
                            <SelectItem
                              key={entityType.id}
                              value={entityType.id}
                            >
                              {entityType.type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <FormField
                  control={form.control}
                  name="path"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormLabel>Path</FormLabel>
                      <FormControl>
                        <SelectDataPath
                          eventType={eventType}
                          onChange={field.onChange}
                          value={field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

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

const Page: NextPageWithLayout = () => {
  const router = useRouter();
  const { toast } = useToast();

  const eventType = router.query.eventType as string;

  const nodes = useEditorStore(selectors.getNodeDefs({ eventType }));

  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const toasts = useMutationToasts();
  const setNodeDefWithFn = useEditorStore.use.setNodeDefWithFn();

  const [open, setOpen] = useState(false);
  const [nodeSelectOpen, setFnSelectOpen] = useState(false);

  const filteredNodes = useMemo(
    () => nodes?.filter((node) => !HIDDEN_NODE_TYPES.includes(node.fn.type)),
    [nodes]
  );

  const [newFnType, setNewFnType] = useState<FnType | null>(null);
  const NodeEditor = newFnType ? MAP_FN_TYPE_TO_EDITOR[newFnType] : null;

  const [newEntityDropdownOpen, setNewEntityDropdownOpen] = useState(false);

  const [selectedNode, setSelectedNode] = useState<NodeDef | null>(null);

  useEffect(() => {
    if (!selectedNode) setSelectedNode(filteredNodes?.[0] ?? null);
  }, [selectedNode, filteredNodes]);

  const { data: engineData } = api.editor.getLatestEngine.useQuery();
  const prevEngineId = usePrevious(engineData?.engineId);
  const initialize = useEditorStore.use.initializeFromNodeDefs();

  useEffect(() => {
    if (engineData && engineData?.engineId !== prevEngineId) {
      initialize(engineData.nodeDefs);
    }
  }, [engineData, initialize, prevEngineId]);

  return (
    <div>
      <Link
        href="/settings/event-types"
        className="text-sm text-muted-foreground flex items-center gap-1"
      >
        <ChevronLeft className="w-3 h-3" />
        Back to event types
      </Link>
      <div className="mt-1 mb-4 flex items-center">
        <h1 className="text-2xl text-emphasis-foreground">{eventType}</h1>

        <Popover open={nodeSelectOpen} onOpenChange={setFnSelectOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              role="combobox"
              variant="outline"
              aria-expanded={nodeSelectOpen}
              className="w-[200px] justify-between ml-4"
            >
              Select node
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search types..." />
              <CommandEmpty>No nodes found.</CommandEmpty>
              <CommandGroup>
                {nodes
                  ?.filter((node) =>
                    [
                      FnType.Computed,
                      FnType.Counter,
                      FnType.UniqueCounter,
                    ].includes(node.fn.type)
                  )
                  .map((node) => (
                    <CommandItem
                      key={node.id}
                      onSelect={() =>
                        void router.push(
                          `/settings/event-types/${
                            router.query.eventType as string
                          }/node/${node.id}`
                        )
                      }
                    >
                      {node.name}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        <Button className="ml-auto">Publish</Button>
      </div>

      <div className="text-lg font-medium">Event Data</div>
      <div className="flex items-center my-2">
        {/* <div className="text-lg">Event Data</div> */}

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

      <Card className="flex max-h-96">
        <div className="p-4 w-80 border-r">
          {filteredNodes?.map((node) => (
            <div
              className={clsx(
                "px-4 py-1 w-full text-sm font text-muted-foreground text-left rounded-md transition flex gap-2 items-center hover:bg-muted",
                {
                  "bg-accent text-accent-foreground":
                    selectedNode?.id === node.id,
                }
              )}
              onClick={() => setSelectedNode(node)}
              key={node.id}
            >
              <div>{node.name}</div>

              <div className="text-blue-300 text-xs font-bold">
                {node.fn.returnSchema.type}
              </div>
              <Button size="iconXs" variant="link" className="h-3 ml-auto">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </Button>
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
                        dataPath: dataPath,
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
                        dataPath: dataPath,
                        entityDataPath: undefined,
                        featureId: "",
                      }}
                    >
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        Assign to entity
                      </DropdownMenuItem>
                    </AssignFeature>

                    <EntityDialog
                      eventType={eventType}
                      defaults={{ path: dataPath }}
                      title="New Entity"
                      onSubmit={(values) => {
                        // Create entity appearance
                        const entityType = entityTypes?.find(
                          (entityType) => entityType.id === values.entityTypeId
                        );
                        if (!entityType) {
                          toast({
                            title: "Failed to create entity",
                            description: "Entity type not found",
                          });
                          return;
                        }
                        if (!eventType) {
                          toast({
                            title: "Failed to create entity",
                            description: "Event type not found",
                          });
                          return;
                        }

                        setNodeDefWithFn(FnType.EntityAppearance, {
                          id: generateNanoId(),
                          name: entityType.type,
                          eventType,
                          inputs: {
                            dataPath: values.path,
                          },
                          fn: {
                            id: generateNanoId(),
                            type: FnType.EntityAppearance,
                            returnSchema: {
                              type: TypeName.Entity,
                              entityType: values.entityTypeId,
                            },
                            config: {
                              entityType: values.entityTypeId,
                            },
                            name: entityType.type,
                          },
                        })
                          .then(toasts.createNode.onSuccess)
                          .catch(toasts.createNode.onError)
                          .catch(handleError);
                      }}
                    >
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        New entity
                      </DropdownMenuItem>
                    </EntityDialog>
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
        <Popover
          open={newEntityDropdownOpen}
          onOpenChange={setNewEntityDropdownOpen}
        >
          <PopoverTrigger asChild>
            <Button role="combobox" aria-expanded={open} size="sm">
              New entity
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search entities..." />
              <CommandEmpty>No entities found.</CommandEmpty>
              <CommandGroup>
                {entityTypes?.map((type) => (
                  <CommandItem
                    key={type.id}
                    value={type.type}
                    onSelect={() => {
                      setNewEntityDropdownOpen(false);
                    }}
                  >
                    {type.type}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <AssignEntities />

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
          {newFnType && <NodeEditor />}
        </SheetContent>
      </Sheet>
    </div>
  );
};

Page.getLayout = (page) => <SettingsLayout>{page}</SettingsLayout>;

export default Page;

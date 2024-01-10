import { useMemo, useState } from "react";

import { TypeName, NodeType, type NodeDef } from "event-processing";

import { zodResolver } from "@hookform/resolvers/zod";
import { uniqBy } from "lodash";
import { Check, Pencil, Plus, Save, X } from "lucide-react";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { EditComputed } from "~/components/features/feature-types/EditComputed";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "~/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import { api } from "~/utils/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

const DATA_TYPE_OPTIONS = [
  {
    label: "String",
    value: TypeName.String,
  },
  {
    label: "Number",
    value: TypeName.Float64,
  },
  {
    label: "Boolean",
    value: TypeName.Boolean,
  },
  {
    label: "JSON",
    value: TypeName.Object,
  },
];

const TYPE_DEFAULTS = {
  [NodeType.Computed]: {
    dataType: TypeName.Boolean,
    config: {
      code: "",
      depsMap: {},
      assignedEntityFeatureIds: [],
    },
  },
  [NodeType.Counter]: {
    dataType: TypeName.Int64,
    config: {
      timeWindow: {
        number: 1,
        unit: "hours",
      },
      countByFeatureIds: [],
      conditionFeatureId: undefined,
    }, // as FeatureDefs[FeatureType.Count]["config"],
  },
  [NodeType.UniqueCounter]: {
    dataType: TypeName.Int64,
    config: {
      timeWindow: {
        number: 1,
        unit: "hours",
      },
      countByFeatureIds: [],
      countUniqueFeatureIds: [],
      conditionFeatureId: undefined,
    }, // as FeatureDefs[FeatureType.UniqueCount]["config"],
  },
  [NodeType.LogEntityFeature]: {
    dataType: TypeName.Entity,
    config: {
      eventTypes: new Set(),
      code: "",
      depsMap: {},
    },
  },
} as Record<
  NodeType,
  {
    dataType: TypeName;
    config: any;
  }
>;

//

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  dataType: z.nativeEnum(TypeName),
  featureDeps: z.array(
    z.object({
      featureId: z.string(),
      featureName: z.string(),
      nodeId: z.string(),
      nodeName: z.string(),
    })
  ),
  nodeDeps: z.array(
    z.object({
      nodeId: z.string(),
      nodeName: z.string(),
    })
  ),
});

interface Props {
  initialNodeDef?: NodeDef;
  onRename: (name: string) => void;
  onSave: (data: NodeDef) => void;
}

export function EditNodeDef({ initialNodeDef, onSave, onRename }: Props) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      dataType: TypeName.String,
      featureDeps: [],
      nodeDeps: [],
    },
  });

  const router = useRouter();

  const { data: features, refetch: refetchFeatures } =
    api.features.list.useQuery();

  const { data: nodes } = api.nodeDefs.getNodesForEventType.useQuery(
    { eventTypeId: router.query.eventTypeId as string },
    { enabled: !!router.query.eventTypeId }
  );

  const [config, setConfig] = useState(
    initialNodeDef?.config ?? {
      code: "",
      depsMap: {},
    }
  );

  // // If we're editing an existing feature then populate forms w/ data.
  // // Name, type, and datatype can't be changed after creation so the
  // // fields are disabled.
  // const isEditingExistingFeature = !!initialDef;

  // const [featureDef, setFeatureDef] = useState<Partial<NodeDef>>(
  //   initialDef ?? {
  //     // defaults for some fields
  //     name: "",
  //     eventTypes: new Set(),
  //     dependsOn: new Set(),
  //     type: NodeType.Computed,
  //     dataType: DataType.Boolean,
  //     config: TYPE_DEFAULTS[NodeType.Computed].config,
  //   }
  // );
  // const updateFeatureDef = (data: Partial<NodeDef>) => {
  //   if (!featureDef) return;
  //   setFeatureDef({ ...featureDef, ...data });
  // };

  // // Whether or not the featureType-specific config is valid
  const [isCodeValid, setIsCodeValid] = useState(false);

  // const everythingValid = useMemo(() => {
  //   return (
  //     featureDef?.name &&
  //     featureDef?.type &&
  //     featureDef?.dataType &&
  //     typeDetailsValid
  //   );
  // }, [featureDef, typeDetailsValid]);

  // const save = () => {
  //   if (!featureDef || !everythingValid) return;
  //   // TODO: validate that featureDef is a complete NodeDef
  //   onFeatureDefSave?.(featureDef as NodeDef);
  // };

  // TEMP

  // const { name, type, dataType, eventTypes, config } = featureDef ?? {};

  const isValid = useMemo(
    () => form.formState.isValid && isCodeValid,
    [form.formState.isValid, isCodeValid]
  );

  const isEditing = useMemo(() => !!initialNodeDef, [initialNodeDef]);

  const [entityNode, setEntityNode] = useState<NodeDef | null>();
  const [entityDepsDropdownOpen, setEntityDepsDropdownOpen] = useState(false);
  const [nodeDepsDropdownOpen, setNodeDepsDropdownOpen] = useState(false);

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-emphasis-foreground text-2xl mt-1 mb-4">
          {isEditing ? initialNodeDef.name : "Create Node"}
        </h1>

        <div className="flex gap-2 items-center">
          {isEditing && (
            <RenameDialog
              name={name}
              onRename={(newName) => {
                onRename?.(newName);
                updateFeatureDef({ name: newName });
              }}
            />
          )}
          <Button
            disabled={!isValid}
            onClick={(event) => {
              event.preventDefault();

              onSave({
                ...initialNodeDef,
                name: form.getValues("name"),
                dataType: form.getValues("dataType"),
                config,
              });
            }}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {!isEditing && (
        <Form {...form}>
          <form>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="w-[16rem]">
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dataType"
              render={({ field }) => (
                <FormItem className="w-[16rem] mt-4">
                  <FormLabel>Entity Type</FormLabel>
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
                      {DATA_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="text-sm font-medium mt-4 mb-2">
              Entity Dependencies
            </div>

            <div className="flex space-x-2 mt-2">
              {form
                .watch("featureDeps")
                .map(({ nodeName, featureName, nodeId, featureId }, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 rounded-md border px-2 py-1"
                  >
                    <div className="text-sm">{nodeName}</div>
                    <div className="text-sm">{featureName}</div>
                    <X
                      className="h-4 w-4"
                      onClick={() =>
                        form.setValue(
                          "featureDeps",
                          form
                            .getValues("featureDeps")
                            .filter(
                              (dep) =>
                                dep.nodeId !== nodeId ||
                                dep.featureId !== featureId
                            )
                        )
                      }
                    />
                  </div>
                ))}

              <Popover
                open={entityDepsDropdownOpen}
                onOpenChange={(open) => {
                  setEntityDepsDropdownOpen(open);
                  if (!open) setEntityNode(null);
                }}
              >
                <PopoverTrigger asChild>
                  <Button variant="outline" size="xs">
                    <Plus className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[16rem] p-0">
                  {entityNode ? (
                    <Command>
                      <CommandInput placeholder="Search properties..." />
                      <CommandEmpty>No properties found.</CommandEmpty>
                      <CommandGroup>
                        {features
                          ?.filter(
                            (feature) =>
                              feature.belongsTo[0]?.entityTypeId ===
                              entityNode?.node.dataType?.entityType
                          )
                          .map((feature) => (
                            <CommandItem
                              value={feature.name}
                              key={feature.id}
                              onSelect={() => {
                                setEntityDepsDropdownOpen(false);
                                form.setValue(
                                  "featureDeps",
                                  uniqBy(
                                    [
                                      ...form.getValues("featureDeps"),
                                      {
                                        nodeId: entityNode.nodeId,
                                        nodeName: entityNode.node.name,
                                        featureId: feature.id,
                                        featureName: feature.name,
                                      },
                                    ],
                                    (dep) => dep.featureId + dep.nodeId
                                  )
                                );
                                setEntityNode(null);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  form
                                    .getValues("featureDeps")
                                    .some(
                                      (dep) =>
                                        dep.nodeId === entityNode.nodeId &&
                                        dep.featureId === feature.id
                                    )
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {feature.name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </Command>
                  ) : (
                    <Command>
                      <CommandInput placeholder="Search nodes..." />
                      <CommandEmpty>No entities found.</CommandEmpty>
                      <CommandGroup>
                        {nodes
                          ?.filter(
                            (node) =>
                              node.node.dataType?.type === TypeName.Entity
                          )
                          .map((node) => (
                            <CommandItem
                              value={node.node.name}
                              key={node.node.id}
                              onSelect={() => {
                                setEntityNode(node);
                              }}
                            >
                              {node.node.name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </Command>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="text-sm font-medium mt-4 mb-2">
              Node Dependencies
            </div>

            <div className="flex space-x-2 mt-2">
              {form.watch("nodeDeps").map(({ nodeName, nodeId }) => (
                <div
                  key={nodeId}
                  className="flex items-center space-x-2 rounded-md border px-2 py-1"
                >
                  <div className="text-sm">{nodeName}</div>
                  <X
                    className="h-4 w-4"
                    onClick={() =>
                      form.setValue(
                        "nodeDeps",
                        form
                          .getValues("nodeDeps")
                          .filter((dep) => dep.nodeId !== nodeId)
                      )
                    }
                  />
                </div>
              ))}
              <Popover
                open={nodeDepsDropdownOpen}
                onOpenChange={setNodeDepsDropdownOpen}
              >
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" size="xs">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[16rem] p-0">
                  <Command>
                    <CommandInput placeholder="Search nodes..." />
                    <CommandEmpty>No nodes found.</CommandEmpty>

                    <CommandGroup>
                      {nodes
                        ?.filter((node) => !node.config?.paths)
                        .map((node) => (
                          <CommandItem
                            value={node.node.name}
                            key={node.node.id}
                            onSelect={() => {
                              setNodeDepsDropdownOpen(false);
                              form.setValue(
                                "nodeDeps",
                                uniqBy(
                                  [
                                    ...form.getValues("nodeDeps"),
                                    {
                                      nodeId: node.node.id,
                                      nodeName: node.node.name,
                                    },
                                  ],
                                  "nodeId"
                                )
                              );
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                form
                                  .getValues("nodeDeps")
                                  .some((dep) => dep.nodeId === node.node.id)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {node.node.name}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </form>
        </Form>
      )}

      {/* <EventTypes
        eventTypes={eventTypes}
        onChange={(v) => {
          updateFeatureDef({ eventTypes: v });
        }}
      /> */}

      <Separator className="my-8" />

      <EditComputed
        nodeDef={
          initialNodeDef ?? {
            dataType: {
              type: form.watch("dataType"),
            },
            config: {
              code: "",
              depsMap: {},
            },
          }
        }
        onConfigChange={setConfig}
        onValidChange={setIsCodeValid}
      />
    </div>
  );
}

//

function RenameDialog(props: {
  name?: string;
  onRename: (name: string) => void;
}) {
  const { name, onRename } = props;

  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState(name ?? "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          {/* todo */}
          <Pencil className="w-4 h-4" /> Rename
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename</DialogTitle>
          <DialogDescription>
            Names are not tied to versioning. The name change applies
            immediately.
          </DialogDescription>
        </DialogHeader>
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onRename(newName);
              setOpen(false);
            }}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

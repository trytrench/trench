import { zodResolver } from "@hookform/resolvers/zod";
import {
  DataPath,
  FeatureDef,
  NodeDef,
  NodeDefsMap,
  TSchema,
  TypeName,
  tSchemaZod,
  FnType,
  hasFnType,
} from "event-processing";
import { ChevronsUpDown, MoreHorizontal, Plus } from "lucide-react";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
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
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { useToast } from "~/components/ui/use-toast";
import { api } from "~/utils/api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Fn, Rule } from "@prisma/client";
import { SchemaBuilder } from "../SchemaBuilder";
import { AssignFeature } from "./AssignFeatureDialog";
import { RenderDataPath } from "./RenderDataPath";
import clsx from "clsx";
import { SelectDataPathOrEntityFeature } from "./SelectDataPathOrEntityFeature";

const featureSchema = z.object({
  name: z.string(),
  entityTypeId: z.string(),
  schema: tSchemaZod,
});

const eventFeatureSchema = z.object({
  name: z.string(),
  schema: tSchemaZod,
});

const ruleSchema = z.object({
  name: z.string(),
});

const EventFeatureDialog = ({
  title,
  children,
  onSubmit,
}: {
  title: string;
  entityTypeId?: string;
  children: React.ReactNode;
  onSubmit: (values: z.infer<typeof eventFeatureSchema>) => void;
}) => {
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof eventFeatureSchema>>({
    resolver: zodResolver(eventFeatureSchema),
    defaultValues: {
      name: "",
      schema: {
        type: TypeName.String,
      },
    },
  });

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
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <FormField
                  control={form.control}
                  name="schema"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormLabel>Data Type</FormLabel>
                      <div>
                        <SchemaBuilder
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </div>
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
};

const FeatureDialog = ({
  title,
  entityTypeId,
  children,
  onSubmit,
}: {
  title: string;
  entityTypeId?: string;
  children: React.ReactNode;
  onSubmit: (values: z.infer<typeof featureSchema>) => void;
}) => {
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof featureSchema>>({
    resolver: zodResolver(featureSchema),
    defaultValues: {
      name: "",
      entityTypeId,
      schema: {
        type: TypeName.String,
      },
    },
  });
  const { data: entityTypes } = api.entityTypes.list.useQuery();

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
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <FormField
                  control={form.control}
                  name="entityTypeId"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
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
                  name="schema"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormLabel>Data Type</FormLabel>
                      <div>
                        <SchemaBuilder
                          value={field.value as TSchema}
                          onChange={field.onChange}
                        />
                      </div>
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
};

const RuleDialog = ({
  title,
  children,
  onSubmit,
}: {
  title: string;
  children: React.ReactNode;
  onSubmit: (values: { name: string; color: string }) => void;
}) => {
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof ruleSchema>>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: "",
    },
  });

  const [color, setColor] = useState("bg-gray-400");

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
              onSubmit({
                name: values.name,
                color,
              });
              setOpen(false);
              form.reset();
            })}
          >
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Color</div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <div className={`rounded-full ${color} w-3 h-3`}></div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="flex space-x-2">
                      {[
                        "bg-gray-400",
                        "bg-green-600",
                        "bg-yellow-300",
                        "bg-orange-400",
                        "bg-red-500",
                      ].map((color) => (
                        <div
                          key={color}
                          onClick={() => {
                            setColor(color);
                          }}
                          className={`rounded-full ${color} w-4 h-4`}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
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
};

const FeatureCard = ({ name, path }: { name: string; path?: DataPath }) => {
  return (
    <div className="flex justify-between items-center h-8">
      <div className="flex items-center space-x-2">
        <div className="text-emphasis-foreground font-medium text-sm">
          {name}
        </div>
        <div className="text-sm">{path?.schema.type}</div>
        {path && <RenderDataPath dataPath={path} />}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="link">
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuItem>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const RuleCard = ({ name, color }: { name: string; color: string | null }) => {
  return (
    <Card className="px-4 flex justify-between items-center">
      <div className="flex gap-2 items-center">
        <div className={`rounded-full ${color} w-2 h-2`} />
        <div className="text-emphasis-foreground text-sm">{name}</div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="link">
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuItem>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  );
};

const EntityCard = ({
  name,
  path,
  children,
}: {
  name: string;
  path?: DataPath;
  children: React.ReactNode;
}) => {
  return (
    <Collapsible>
      <Card className="px-4 py-2">
        <div className="flex items-center">
          <div className="flex items-center space-x-2">
            <div className="font-semibold text-emphasis-foreground">{name}</div>
            <div className="text-sm">
              {path && <RenderDataPath dataPath={path} />}
            </div>
          </div>

          <Button size="xs" className="ml-auto">
            {/* <Plus className="h-4 w-4 mr-1" /> */}
            New property
          </Button>
          {/* <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              <ChevronsUpDown className="h-4 w-4" />
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger> */}
        </div>

        <Separator className="my-2" />
        {children}
        {/* <CollapsibleContent className="space-y-2 mb-8">
          <Separator className="my-2" />
          {children}
        </CollapsibleContent> */}
      </Card>
    </Collapsible>
  );
};

const FeatureItem = ({
  feature,
  rule,
  node,
}: {
  feature: FeatureDef;
  rule?: Rule;
  node?: NodeDef<FnType.LogEntityFeature>;
}) => {
  const [dataPath, setDataPath] = useState<DataPath | null>(
    node?.inputs.dataPath ?? null
  );
  const router = useRouter();

  return (
    <div key={feature.id} className="flex items-center space-x-2 h-8">
      {rule && <div className={`rounded-full ${rule.color} w-2 h-2`} />}
      <div className="font-medium text-sm">{feature.name}</div>

      <div className="text-blue-300 text-xs font-bold">
        {feature.schema.type}
      </div>

      <SelectDataPathOrEntityFeature
        value={dataPath}
        onChange={setDataPath}
        eventType={router.query.eventType as string}
        desiredSchema={feature.schema}
      />
    </div>
  );
};

export default function AssignEntities() {
  const router = useRouter();
  const { toast } = useToast();

  const eventType = router.query.eventType as string;

  const { data: features, refetch: refetchFeatures } =
    api.features.list.useQuery();

  const { data: rules, refetch: refetchRules } = api.rules.list.useQuery();

  const { mutateAsync: createFeature } = api.features.create.useMutation();
  const { mutateAsync: createEventFeature } =
    api.features.createEventFeature.useMutation();
  const { mutateAsync: createRule } = api.rules.create.useMutation();

  const { data: nodes } = api.nodeDefs.list.useQuery({ eventType });

  const featureToNodeMap = useMemo(() => {
    if (!nodes) return {};
    return nodes.reduce(
      (acc, node) => {
        if (hasFnType(node, FnType.LogEntityFeature)) {
          return { ...acc, [node.fn.config.featureId]: node };
        }
        return acc;
      },
      {} as Record<string, NodeDefsMap[FnType.LogEntityFeature]>
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

  const [selectedNode, setSelectedNode] = useState<NodeDef | null>(null);

  const filteredNodes = useMemo(
    () => nodes?.filter((node) => hasFnType(node, FnType.EntityAppearance)),
    [nodes]
  );

  useEffect(() => {
    if (!selectedNode) setSelectedNode(filteredNodes?.[0] ?? null);
  }, [selectedNode, filteredNodes]);

  return (
    <div>
      <Card className="flex relative">
        <div className="p-4 w-48 border-r">
          {nodes
            ?.filter((node) => hasFnType(node, FnType.EntityAppearance))
            .map((n) => (
              <div
                className={clsx(
                  "px-4 py-1 w-full text-sm font text-muted-foreground text-left rounded-md transition flex justify-between items-center hover:bg-muted",
                  {
                    "bg-accent text-accent-foreground":
                      selectedNode?.id === n.id,
                  }
                )}
                onClick={() => setSelectedNode(n)}
                key={n.id}
              >
                {n.name}
              </div>
            ))}
        </div>
        {selectedNode && (
          <div className="flex-1">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <Input className="w-[200px]" placeholder="Filter features..." />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="xs">New property</Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent>
                  <RuleDialog
                    title="Create Rule"
                    onSubmit={(values) => {
                      createRule({
                        name: values.name,
                        color: values.color,
                        entityTypeId: selectedNode.fn.returnSchema.entityType,
                      })
                        .then(() => {
                          toast({
                            title: "Rule created",
                          });

                          return refetchRules();
                        })
                        .catch(() => {
                          toast({
                            variant: "destructive",
                            title: "Failed to create rule",
                          });
                        });
                    }}
                  >
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      Create rule
                    </DropdownMenuItem>
                  </RuleDialog>
                  <FeatureDialog
                    title="Create Entity Property"
                    entityTypeId={selectedNode.fn.returnSchema.entityType}
                    onSubmit={(values) => {
                      createFeature({
                        name: values.name,
                        entityTypeId: values.entityTypeId,
                        schema: values.schema,
                      })
                        .then(() => {
                          toast({
                            title: "Entity property created",
                            description: `${values.name}`,
                          });
                          return refetchFeatures();
                        })
                        .catch(() => {
                          toast({
                            variant: "destructive",
                            title: "Failed to create entity property",
                          });
                        });
                    }}
                  >
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      Create property
                    </DropdownMenuItem>
                  </FeatureDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="px-6 pt-2 pb-4">
              {features
                ?.filter(
                  (feature) =>
                    feature.entityTypeId ===
                    selectedNode.fn.returnSchema.entityType
                )
                .map((feature) => (
                  <FeatureItem
                    feature={feature}
                    rule={featureToRuleMap[feature.id]}
                    node={featureToNodeMap[feature.id]}
                    key={feature.id}
                  />
                ))}

              {/* {rules
          ?.filter(
            (rule) =>
              rule.feature.entityTypeId === node.fn.returnSchema.entityType &&
              featureToNodeMap[rule.featureId]
          )
          .map((rule) => (
            <RuleCard
              key={rule.id}
              name={rule.feature.name}
              color={rule.color}
            />
          ))}

        {rules
          ?.filter(
            (rule) =>
              rule.feature.entityTypeId === node.fn.returnSchema.entityType &&
              !featureToNodeMap[rule.featureId]
          )
          .map((rule) => (
            <div key={rule.id} className="flex items-center space-x-2">
              <div className={`rounded-full ${rule.color} w-2 h-2`} />
              <div className="text-emphasis-foreground text-sm">
                {rule.feature.name}
              </div>
            </div>
          ))}

        {features
          ?.filter(
            (feature) =>
              feature.entityTypeId === node.fn.returnSchema.entityType &&
              featureToNodeMap[feature.id] &&
              !featureToRuleMap[feature.id]
          )
          .map((feature) => (
            <FeatureCard
              key={feature.id}
              name={feature.name}
              path={featureToNodeMap[feature.id]?.inputs.dataPath}
            />
          ))}

        {features
          ?.filter(
            (feature) =>
              feature.entityTypeId === node.fn.returnSchema?.entityType &&
              !featureToNodeMap[feature.id] &&
              !featureToRuleMap[feature.id]
          )
          .map((feature) => (
            <div key={feature.id} className="flex items-center space-x-2 h-8">
              <div className="text-emphasis-foreground font-medium text-sm">
                {feature.name}
              </div>
              <div className="text-sm">{feature.schema.type}</div>

              <AssignFeature
                title="Assign Entity Property"
                defaults={{
                  featureId: feature.id,
                  dataPath: null,
                  entityDataPath: {
                    nodeId: node.id,
                    path: [],
                    schema: node.fn.returnSchema,
                  },
                }}
              >
                <Button size="iconXs" variant="outline">
                  <Plus className="h-3 w-3" />
                </Button>
              </AssignFeature>
            </div>
          ))} */}

              {/* <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent>
              <RuleDialog
                title="Create Rule"
                onSubmit={(values) => {
                  createRule({
                    name: values.name,
                    color: values.color,
                    entityTypeId: node.fn.returnSchema?.entityType,
                  })
                    .then(() => {
                      toast({
                        title: "Rule created",
                      });

                      return refetchRules();
                    })
                    .catch(() => {
                      toast({
                        variant: "destructive",
                        title: "Failed to create rule",
                      });
                    });
                }}
              >
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Create rule
                </DropdownMenuItem>
              </RuleDialog>
              <FeatureDialog
                title="Create Entity Property"
                entityTypeId={node.fn.returnSchema?.entityType}
                onSubmit={(values) => {
                  createFeature({
                    name: values.name,
                    entityTypeId: values.entityTypeId,
                    schema: values.schema,
                  })
                    .then(() => {
                      toast({
                        title: "Entity property created",
                        description: `${values.name}`,
                      });
                      return refetchFeatures();
                    })
                    .catch(() => {
                      toast({
                        variant: "destructive",
                        title: "Failed to create entity property",
                      });
                    });
                }}
              >
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Create property
                </DropdownMenuItem>
              </FeatureDialog>
            </DropdownMenuContent>
          </DropdownMenu> */}
            </div>
          </div>
        )}
      </Card>
      {/* <EntityCard name="Event">
        {rules
          ?.filter(
            (rule) =>
              !rule.feature.entityTypeId && featureToNodeMap[rule.featureId]
          )
          .map((rule) => (
            <RuleCard
              key={rule.id}
              name={rule.feature.name}
              color={rule.color}
            />
          ))}

        {rules
          ?.filter(
            (rule) =>
              !rule.feature.entityTypeId && !featureToNodeMap[rule.featureId]
          )
          .map((rule) => (
            <div key={rule.id} className="flex items-center space-x-2">
              <div className={`rounded-full ${rule.color} w-2 h-2`} />
              <div className="text-emphasis-foreground text-sm">
                {rule.feature.name}
              </div>

              <AssignFeature
                title="Assign Rule"
                defaults={{
                  featureId: rule.featureId,
                  dataPath: null,
                  entityDataPath: undefined,
                }}
              >
                <Button
                  size="iconXs"
                  variant="outline"
                  // onClick={() => onAssignToEvent?.(rule.feature)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </AssignFeature>
            </div>
          ))}

        {features
          ?.filter(
            (feature) =>
              !feature.entityTypeId &&
              featureToNodeMap[feature.id] &&
              !featureToRuleMap[feature.id]
          )
          .map((feature) => (
            <FeatureCard
              key={feature.id}
              name={feature.name}
              path={featureToNodeMap[feature.id]?.inputs.dataPath}
            />
          ))}

        {features
          ?.filter(
            (feature) =>
              !feature.entityTypeId &&
              !featureToNodeMap[feature.id] &&
              !featureToRuleMap[feature.id]
          )
          .map((feature) => (
            <div key={feature.id} className="flex items-center space-x-2">
              <div className="text-emphasis-foreground text-sm">
                {feature.name}
              </div>

              {onAssignToEvent ? (
                <Button
                  size="iconXs"
                  variant="outline"
                  onClick={() => onAssignToEvent(feature)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              ) : (
                <AssignFeature
                  title="Assign Event Property"
                  defaults={{
                    featureId: feature.id,
                    dataPath: null,
                    entityDataPath: undefined,
                  }}
                >
                  <Button size="iconXs" variant="outline">
                    <Plus className="h-3 w-3" />
                  </Button>
                </AssignFeature>
              )}
            </div>
          ))}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <RuleDialog
              title="Create Rule"
              onSubmit={(values) => {
                createRule({
                  name: values.name,
                  color: values.color,
                  eventTypeId: router.query.eventTypeId as string,
                })
                  .then(() => {
                    toast({
                      title: "Rule created",
                    });

                    return refetchRules();
                  })
                  .catch(() => {
                    toast({
                      variant: "destructive",
                      title: "Failed to create rule",
                    });
                  });
              }}
            >
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                Create rule
              </DropdownMenuItem>
            </RuleDialog>
            <FeatureDialog
              title="Create Entity Property"
              onSubmit={(values) => {
                createFeature({
                  name: values.name,
                  entityTypeId: values.entityTypeId,
                  schema: values.schema,
                })
                  .then(() => {
                    toast({
                      title: "Entity property created",
                      description: `${values.name}`,
                    });
                    return refetchFeatures();
                  })
                  .catch(() => {
                    toast({
                      variant: "destructive",
                      title: "Failed to create entity property",
                    });
                  });
              }}
            >
              <EventFeatureDialog
                title="Create Event Property"
                onSubmit={(values) => {
                  createEventFeature({
                    name: values.name,
                    schema: values.schema,
                  })
                    .then(() => {
                      toast({
                        title: "Event property created",
                        description: `${values.name}`,
                      });
                      return refetchFeatures();
                    })
                    .catch(() => {
                      toast({
                        variant: "destructive",
                        title: "Failed to create entity property",
                      });
                    });
                }}
              >
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Create property
                </DropdownMenuItem>
              </EventFeatureDialog>
            </FeatureDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </EntityCard> 
      {nodes?.map((node) =>
        hasFnType(node, FnType.EntityAppearance) ? (
          <EntityCard
            name={node.name}
            path={node.inputs.dataPath}
            key={node.id}
          ></EntityCard>
        ) : null
      )}
      */}
    </div>
  );
}

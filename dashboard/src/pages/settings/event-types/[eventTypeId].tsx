import { zodResolver } from "@hookform/resolvers/zod";
import { Feature } from "@prisma/client";
import {
  DataType,
  NodeType,
  NODE_TYPE_DEFS,
  ComputedNodeType,
} from "event-processing";
import {
  ChevronLeft,
  ChevronsUpDown,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { string, z } from "zod";
import SettingsLayout from "~/components/SettingsLayout";
import { SchemaDisplay } from "~/components/features/SchemaDisplay";
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
import { type NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";

const entitySchema = z.object({
  entityTypeId: z.string(),
  path: z.string(),
});

const featureSchema = z.object({
  name: z.string(),
  entityTypeId: z.string(),
  dataType: z.nativeEnum(DataType),
});

const entityFeatureSchema = z.object({
  path: z.string(),
  entityTypeId: z.string(),
  featureId: z.string(),
});

const EntityDialog = ({
  title,
  children,
  onSubmit,
  path,
}: {
  title: string;
  children: React.ReactNode;
  onSubmit: (values: z.infer<typeof entitySchema>) => void;
  path: string;
}) => {
  const [open, setOpen] = useState(false);
  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const form = useForm<z.infer<typeof entitySchema>>({
    resolver: zodResolver(entitySchema),
    defaultValues: {
      entityTypeId: "",
      path,
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
                        <Input {...field} />
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
};

const EntityFeatureDialog = ({
  title,
  children,
  path = "",
  entityTypeId = "",
  featureId = "",
  onSubmit,
}: {
  title: string;
  children: React.ReactNode;
  path?: string;
  entityTypeId?: string;
  featureId?: string;
  onSubmit: (values: z.infer<typeof entityFeatureSchema>) => void;
}) => {
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof entityFeatureSchema>>({
    resolver: zodResolver(entityFeatureSchema),
    defaultValues: {
      path,
      entityTypeId,
      featureId,
    },
  });
  const { data: entityTypes } = api.entityTypes.list.useQuery();
  const { data: features } = api.features.list.useQuery();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
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
                  name="path"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormLabel>Path</FormLabel>
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
              {form.watch("entityTypeId") && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <FormField
                    control={form.control}
                    name="featureId"
                    render={({ field }) => (
                      <FormItem className="col-span-3">
                        <FormLabel>Entity Property</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an entity property" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            {features
                              ?.filter(
                                (feature) =>
                                  feature.belongsTo[0]?.entityTypeId ===
                                  form.watch("entityTypeId")
                              )
                              .map((feature) => (
                                <SelectItem key={feature.id} value={feature.id}>
                                  {feature.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
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
  entityTypeId: string;
  children: React.ReactNode;
  onSubmit: (values: z.infer<typeof featureSchema>) => void;
}) => {
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof featureSchema>>({
    resolver: zodResolver(featureSchema),
    defaultValues: {
      name: "",
      entityTypeId,
      dataType: DataType.String,
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
                  name="dataType"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormLabel>Data Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a data type" />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          {Object.values(DataType).map((dataType) => (
                            <SelectItem key={dataType} value={dataType}>
                              {dataType}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

const FeatureCard = ({ name, path }: { name: string; path?: string }) => {
  return (
    <Card className="px-4 flex justify-between items-center">
      <div className="flex gap-2">
        <div className="text-emphasis-foreground text-sm">{name}</div>
        <div className="text-sm">{path}</div>
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
  path: string;
  children: React.ReactNode;
}) => {
  return (
    <Collapsible>
      <div className="flex justify-between items-center">
        <div>
          <div className="font-semibold text-emphasis-foreground">{name}</div>
          <div className="text-sm">{path}</div>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            <ChevronsUpDown className="h-4 w-4" />
            <span className="sr-only">Toggle</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <Separator className="my-2" />
      <CollapsibleContent className="space-y-2 mb-8">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const Page: NextPageWithLayout = () => {
  const router = useRouter();
  const { toast } = useToast();

  const { data: eventType } = api.eventTypes.get.useQuery(
    { id: router.query.eventTypeId as string },
    { enabled: !!router.query.eventTypeId }
  );

  const { data: features, refetch: refetchFeatures } =
    api.features.list.useQuery();

  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const { mutateAsync: createNodeDef } = api.featureDefs.create.useMutation();
  const { mutateAsync: createFeature } = api.features.create.useMutation();

  const { data: nodes, refetch: refetchNodes } =
    api.featureDefs.getEventTypeNodes.useQuery(
      { eventTypeId: router.query.eventTypeId as string },
      { enabled: !!router.query.eventTypeId }
    );

  const createEntityFeature = (values: z.infer<typeof entityFeatureSchema>) => {
    const feature = features?.find((f) => f.id === values.featureId);

    createNodeDef({
      eventTypes: [router.query.eventTypeId as string],
      name: feature.name,
      featureType: NodeType.Computed,
      dataType: feature.dataType,
      deps: [],
      config: {
        type: ComputedNodeType.Path,
        paths: {
          [router.query.eventTypeId as string]: values.path,
        },
        compiledJs: "",
        tsCode: "",
        depsMap: {},
        featureId: feature.id,
        entityTypeId: values.entityTypeId,
      } as z.infer<(typeof NODE_TYPE_DEFS)[NodeType.Computed]["configSchema"]>,
    })
      .then(() => {
        toast({
          title: "FeatureDef created!",
          description: `${feature.name}`,
        });
        refetchNodes();
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Failed to create FeatureDef",
        });
      });
  };

  return (
    <div>
      <Link
        href="/settings/lists"
        className="text-sm text-muted-foreground flex items-center gap-1"
      >
        <ChevronLeft className="w-3 h-3" />
        Back to event types
      </Link>
      <div className="mt-1 mb-4">
        <h1 className="text-2xl text-emphasis-foreground">{eventType?.type}</h1>
      </div>
      <Card className="h-96 overflow-auto p-6">
        <SchemaDisplay
          basePath="input.event.data"
          baseName="event.data"
          eventTypes={new Set([router.query.eventTypeId as string])}
          renderRightComponent={(path) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="iconXs" variant="link">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent>
                <EntityFeatureDialog
                  title="Assign Entity Property"
                  path={path}
                  onSubmit={createEntityFeature}
                >
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Assign to entity
                  </DropdownMenuItem>
                </EntityFeatureDialog>

                <EntityDialog
                  path={path}
                  title="New Entity"
                  onSubmit={(values) => {
                    // Create entity appearance
                    createNodeDef({
                      eventTypes: [router.query.eventTypeId as string],
                      name: entityTypes?.find(
                        (entityType) => entityType.id === values.entityTypeId
                      )?.type,
                      featureType: NodeType.Computed,
                      dataType: {
                        type: DataType.Entity,
                        entityType: values.entityTypeId,
                      },
                      deps: [],
                      config: {
                        type: ComputedNodeType.Path,
                        paths: {
                          [router.query.eventTypeId as string]: values.path,
                        },
                        compiledJs: "",
                        tsCode: "",
                        depsMap: {},
                      } as z.infer<
                        (typeof NODE_TYPE_DEFS)[NodeType.Computed]["configSchema"]
                      >,
                    })
                      .then(() => {
                        toast({
                          title: "FeatureDef created!",
                          description: `${values.entity}`,
                        });
                        refetchNodes();
                      })
                      .catch(() => {
                        toast({
                          variant: "destructive",
                          title: "Failed to create FeatureDef",
                        });
                      });
                  }}
                >
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    New entity
                  </DropdownMenuItem>
                </EntityDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          // onItemClick={(path: string, name: string) => {
          //   //  copy path to clipboard
          //   navigator.clipboard.writeText(path);
          //   toast({
          //     title: "Copied to clipboard!",
          //     description: path,
          //   });
          // }}
        />
      </Card>
      <div className="h-9" />
      <div className="space-y-4">
        {nodes
          ?.filter((node) => node.node.dataType?.type === DataType.Entity)
          .map((node) => (
            <EntityCard
              name={node.node.name}
              path={node.config?.paths?.[router.query.eventTypeId as string]}
              key={node.id}
            >
              {nodes
                ?.filter(
                  (n) =>
                    n.node.type === NodeType.Computed &&
                    n.config?.entityTypeId === node.node.dataType.entityType
                )
                .map((n) => (
                  <FeatureCard
                    key={n.id}
                    name={n.node.name}
                    path={n.config?.paths?.[router.query.eventTypeId as string]}
                  />
                ))}

              {features
                ?.filter(
                  (feature) =>
                    feature.belongsTo[0]?.entityTypeId ===
                      node.node.dataType?.entityType &&
                    !nodes?.find(
                      (n) =>
                        n.node.type === NodeType.Computed &&
                        n.config?.featureId === feature.id
                    )
                )
                .map((feature) => (
                  // <FeatureCard key={feature.id} name={feature.name} />
                  <div key={feature.id} className="flex items-center space-x-2">
                    <div className="text-emphasis-foreground text-sm">
                      {feature.name}
                    </div>
                    <EntityFeatureDialog
                      title="Assign Entity Property"
                      entityTypeId={node.node.dataType?.entityType}
                      featureId={feature.id}
                      onSubmit={createEntityFeature}
                    >
                      <Button size="iconXs" variant="outline">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </EntityFeatureDialog>
                  </div>
                ))}

              <FeatureDialog
                title="Create Entity Property"
                entityTypeId={node.node.dataType?.entityType}
                onSubmit={(values) => {
                  createFeature({
                    name: values.name,
                    entityTypeId: values.entityTypeId,
                    dataType: {
                      type: values.dataType,
                    },
                  })
                    .then(() => {
                      toast({
                        title: "Feature created!",
                        description: `${values.name}`,
                      });
                      refetchFeatures();
                    })
                    .catch(() => {
                      toast({
                        variant: "destructive",
                        title: "Failed to create feature",
                      });
                    });
                }}
              >
                <Button variant="outline">Create</Button>
              </FeatureDialog>
            </EntityCard>
          ))}
      </div>
    </div>
  );
};

Page.getLayout = (page) => <SettingsLayout>{page}</SettingsLayout>;

export default Page;

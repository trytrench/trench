import { zodResolver } from "@hookform/resolvers/zod";
import {
  DataPath,
  FeatureDef,
  NodeDef,
  NodeDefsMap,
  NodeType,
  TSchema,
  TypeName,
  tSchemaZod,
} from "event-processing";
import { ChevronsUpDown, MoreHorizontal, Plus } from "lucide-react";
import { useRouter } from "next/router";
import React, { useMemo, useState } from "react";
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
import { AssignEntityFeatureDialog } from "./AssignEntityFeatureDialog";
import { SchemaBuilder } from "../SchemaBuilder";
import { AssignFeature } from "./AssignFeatureDialog";
import { RenderDataPath } from "./RenderDataPath";

const featureSchema = z.object({
  name: z.string(),
  entityTypeId: z.string(),
  schema: tSchemaZod,
});

const eventFeatureSchema = z.object({
  name: z.string(),
  schema: tSchemaZod,
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

const FeatureCard = ({ name, path }: { name: string; path?: DataPath }) => {
  return (
    <Card className="px-4 flex justify-between items-center">
      <div className="flex gap-2">
        <div className="text-emphasis-foreground text-sm">{name}</div>
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
      <div className="flex justify-between items-center">
        <div>
          <div className="font-semibold text-emphasis-foreground">{name}</div>
          <div className="text-sm">
            {path && <RenderDataPath dataPath={path} />}
          </div>
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

interface Props {
  onAssign?: (node: NodeDef, feature: FeatureDef) => void;
  onAssignToEvent?: (feature: FeatureDef) => void;
}

export default function AssignEntities({ onAssign, onAssignToEvent }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const eventType = router.query.eventType as string;

  const { data: features, refetch: refetchFeatures } =
    api.features.list.useQuery();

  const { mutateAsync: createFeature } = api.features.create.useMutation();
  const { mutateAsync: createEventFeature } =
    api.features.createEventFeature.useMutation();

  const { data: nodes } = api.nodeDefs.list.useQuery({ eventType });

  const featureToNodeMap = useMemo(() => {
    if (!nodes) return {};
    return nodes.reduce(
      (acc, node) => {
        if (node.type === NodeType.LogEntityFeature) {
          return { ...acc, [node.config.featureId]: node };
        }
        return acc;
      },
      {} as Record<string, NodeDefsMap[NodeType.LogEntityFeature]>
    );
  }, [nodes]);

  const eventNode = nodes?.find((node) => node.type === NodeType.Event);

  return (
    <div className="space-y-4">
      <EntityCard name="Event">
        {features
          ?.filter((feature) => !feature.entityTypeId)
          .map((feature) => (
            <FeatureCard
              key={feature.id}
              name={feature.name}
              path={featureToNodeMap[feature.id]?.config.dataPath}
            />
          ))}

        {features
          ?.filter(
            (feature) => !feature.entityTypeId && !featureToNodeMap[feature.id]
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
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </EventFeatureDialog>
      </EntityCard>
      {nodes?.map((node) =>
        node.type === NodeType.EntityAppearance ? (
          <EntityCard
            name={node.name}
            path={node.config.dataPath}
            key={node.id}
          >
            {features
              ?.filter(
                (feature) =>
                  feature.entityTypeId === node.returnSchema.entityType &&
                  featureToNodeMap[feature.id]
              )
              .map((feature) => (
                <FeatureCard
                  key={feature.id}
                  name={feature.name}
                  path={featureToNodeMap[feature.id]?.config.dataPath}
                />
              ))}

            {features
              ?.filter(
                (feature) =>
                  feature.entityTypeId === node.returnSchema?.entityType &&
                  !featureToNodeMap[feature.id]
              )
              .map((feature) => (
                <div key={feature.id} className="flex items-center space-x-2">
                  <div className="text-emphasis-foreground text-sm">
                    {feature.name}
                  </div>

                  {onAssign ? (
                    <Button
                      size="iconXs"
                      variant="outline"
                      onClick={() => onAssign(node, feature)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  ) : (
                    <AssignFeature
                      title="Assign Entity Property"
                      defaults={{
                        featureId: feature.id,
                        dataPath: null,
                        entityDataPath: {
                          nodeId: node.id,
                          path: [],
                          schema: node.returnSchema,
                        },
                      }}
                    >
                      <Button size="iconXs" variant="outline">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </AssignFeature>
                  )}
                </div>
              ))}

            <FeatureDialog
              title="Create Entity Property"
              entityTypeId={node.returnSchema?.entityType}
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
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </FeatureDialog>
          </EntityCard>
        ) : null
      )}
    </div>
  );
}

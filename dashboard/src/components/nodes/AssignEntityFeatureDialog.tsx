import { zodResolver } from "@hookform/resolvers/zod";
import {
  NodeDefsMap,
  NodeType,
  TypeName,
  dataPathZodSchema,
} from "event-processing";
import { ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "~/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
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
import { useToast } from "~/components/ui/use-toast";
import { cn } from "~/lib/utils";
import { api } from "~/utils/api";

const formSchema = z.object({
  dataPath: dataPathZodSchema.nullable(),
  entityDataPath: dataPathZodSchema.optional(),
  featureId: z.string(),
});

type FormType = z.infer<typeof formSchema>;

export function AssignEntityFeatureDialog({
  title,
  children,
  defaults,
}: {
  title: string;
  children: React.ReactNode;
  defaults: FormType;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults,
  });
  const { data: features } = api.features.list.useQuery();

  const { mutateAsync: createNodeDef } = api.nodeDefs.create.useMutation();
  const { data: nodes, refetch: refetchNodes } = api.nodeDefs.list.useQuery(
    { eventType: router.query.eventType as string },
    { enabled: !!router.query.eventType }
  );

  const [entityNode, setEntityNode] = useState<
    NodeDefsMap[NodeType.EntityAppearance] | null
  >();
  const [entityDepsDropdownOpen, setEntityDepsDropdownOpen] = useState(false);

  const createEntityFeature = (values: FormType) => {
    const feature = features?.find((f) => f.id === values.featureId);
    if (!feature) throw new Error("Feature not found");

    // createNodeDef({
    //   eventTypes: [router.query.eventType as string],
    //   name: feature.name,
    //   type: NodeType.LogEntityFeature,
    //   returnSchema: {
    //     type: TypeName.Any,
    //   },
    //   dependsOn: [],
    //   config: {
    //     featureId: feature.id,
    //     entityAppearanceNodeId: values.entityProperty?.entityNodeId,
    //     featureSchema: feature.schema,
    //     dataPath: {
    //       nodeId: "event",
    //       path: values.path.replace("input.event.data.", ""),
    //     },
    //   } as NodeDefsMap[NodeType.LogEntityFeature]["config"],
    // })
    //   .then(() => {
    //     toast({
    //       title: "Entity property assigned",
    //       // description: `${feature.name}`,
    //     });
    //     return refetchNodes();
    //   })
    //   .catch(() => {
    //     toast({
    //       variant: "destructive",
    //       title: "Failed to assign entity property",
    //     });
    //   });
  };

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
              createEntityFeature(values);
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

              <FormField
                control={form.control}
                name="entityProperty"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Entity Property</FormLabel>

                    <Popover
                      open={entityDepsDropdownOpen}
                      onOpenChange={(open) => {
                        setEntityDepsDropdownOpen(open);
                        if (!open) setEntityNode(null);
                      }}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-[16rem] justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? `${field.value.entityName} - ${field.value.featureName}`
                              : "Select entity property"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
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
                                    feature.entityTypeId ===
                                    entityNode?.returnSchema?.entityType
                                )
                                .map((feature) => (
                                  <CommandItem
                                    value={feature.name}
                                    key={feature.id}
                                    onSelect={() => {
                                      setEntityDepsDropdownOpen(false);
                                      form.setValue("entityProperty", {
                                        entityNodeId: entityNode.id,
                                        entityName: entityNode.name,
                                        featureId: feature.id,
                                        featureName: feature.name,
                                      });
                                      setEntityNode(null);
                                    }}
                                  >
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
                                    node.type === NodeType.EntityAppearance
                                )
                                .map((node) => (
                                  <CommandItem
                                    value={node.name}
                                    key={node.id}
                                    onSelect={() => {
                                      setEntityNode(
                                        node as NodeDefsMap[NodeType.EntityAppearance]
                                      );
                                    }}
                                  >
                                    {node.name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </Command>
                        )}
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

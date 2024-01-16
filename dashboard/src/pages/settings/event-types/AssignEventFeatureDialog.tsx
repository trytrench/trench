import { zodResolver } from "@hookform/resolvers/zod";
import { FeatureDef, NodeDefsMap, NodeType, TypeName } from "event-processing";
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

const entityFeatureSchema = z.object({
  path: z.string(),
  feature: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export default function AssignEventFeatureDialog({
  title,
  children,
  path = "",
  feature,
}: {
  title: string;
  children: React.ReactNode;
  path?: string;
  feature?: FeatureDef;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof entityFeatureSchema>>({
    resolver: zodResolver(entityFeatureSchema),
    defaultValues: {
      path,
      feature,
    },
  });
  const { data: features } = api.features.list.useQuery();

  const { mutateAsync: createNodeDef } = api.nodeDefs.create.useMutation();
  const { refetch: refetchNodes } = api.nodeDefs.list.useQuery(
    { eventTypeId: router.query.eventTypeId as string },
    { enabled: false }
  );

  const [entityDepsDropdownOpen, setEntityDepsDropdownOpen] = useState(false);

  const createEventFeature = (values: z.infer<typeof entityFeatureSchema>) => {
    const feature = features?.find((f) => f.id === values.feature.id);
    if (!feature) throw new Error("Feature not found");

    createNodeDef({
      eventTypes: [router.query.eventTypeId as string],
      name: feature.name,
      type: NodeType.LogEntityFeature,
      returnSchema: {
        type: TypeName.Any,
      },
      dependsOn: [],
      config: {
        featureId: feature.id,
        featureSchema: feature.schema,
        valueAccessor: {
          nodeId: null,
          path: values.path.replace("input.event.data.", ""),
        },
      } as NodeDefsMap[NodeType.LogEntityFeature]["config"],
    })
      .then(() => {
        toast({
          title: "Event property assigned",
          // description: `${feature.name}`,
        });
        return refetchNodes();
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Failed to assign event property",
        });
      });
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
              createEventFeature(values);
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
                name="feature"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Event Property</FormLabel>

                    <Popover
                      open={entityDepsDropdownOpen}
                      onOpenChange={setEntityDepsDropdownOpen}
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
                              ? field.value.name
                              : "Select event property"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[16rem] p-0">
                        <Command>
                          <CommandInput placeholder="Search properties..." />
                          <CommandEmpty>No properties found.</CommandEmpty>
                          <CommandGroup>
                            {features
                              ?.filter((feature) => !feature.entityTypeId)
                              .map((feature) => (
                                <CommandItem
                                  value={feature.name}
                                  key={feature.id}
                                  onSelect={() => {
                                    setEntityDepsDropdownOpen(false);
                                    form.setValue("feature", {
                                      id: feature.id,
                                      name: feature.name,
                                    });
                                  }}
                                >
                                  {feature.name}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </Command>
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

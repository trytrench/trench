import { zodResolver } from "@hookform/resolvers/zod";
import { ComputedNodeType, NODE_TYPE_DEFS, NodeType } from "event-processing";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useToast } from "~/components/ui/use-toast";
import { api } from "~/utils/api";

const entityFeatureSchema = z.object({
  path: z.string(),
  entityTypeId: z.string(),
  featureId: z.string(),
});

export default function EntityFeatureDialog({
  title,
  children,
  path = "",
  entityTypeId = "",
  featureId = "",
}: {
  title: string;
  children: React.ReactNode;
  path?: string;
  entityTypeId?: string;
  featureId?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

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

  const { mutateAsync: createNodeDef } = api.nodeDefs.create.useMutation();
  const { data: nodes, refetch: refetchNodes } =
    api.nodeDefs.getNodesForEventType.useQuery(
      { eventTypeId: router.query.eventTypeId as string },
      { enabled: !!router.query.eventTypeId }
    );

  const createEntityFeature = (values: z.infer<typeof entityFeatureSchema>) => {
    const feature = features?.find((f) => f.id === values.featureId);

    createNodeDef({
      eventTypes: [router.query.eventTypeId as string],
      name: feature.name,
      type: NodeType.Computed,
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
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
}

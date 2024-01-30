import { zodResolver } from "@hookform/resolvers/zod";
import {
  FeatureDef,
  FnType,
  TypeName,
  buildNodeDefWithFn,
  dataPathZodSchema,
} from "event-processing";
import { ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
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
import { handleError } from "../../lib/handleError";
import { SelectDataPath } from "./SelectDataPath";
import { ComboboxSelector } from "../ComboboxSelector";
import { SelectDataPathOrEntityFeature } from "./SelectDataPathOrEntityFeature";
import { useMutationToasts } from "./editor/useMutationToasts";
import { useEditorStore } from "./editor/state/zustand";
import { generateNanoId } from "../../../../packages/common/src";

const formSchema = z.object({
  dataPath: dataPathZodSchema.nullable(),
  entityDataPath: dataPathZodSchema.optional(),
  featureId: z.string(),
});

type FormType = z.infer<typeof formSchema>;

export function AssignFeature({
  title,
  children,
  defaults,
}: {
  title: string;
  children: React.ReactNode;
  defaults?: FormType;
}) {
  const router = useRouter();
  const eventType = router.query.eventType as string;
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...defaults,
      dataPath: {
        nodeId: "",
        path: [],
      },
      entityDataPath: undefined,
      featureId: "",
    },
  });

  const [initializedForm, setInitializedForm] = useState(false);
  useEffect(() => {
    if (!initializedForm && defaults) {
      form.reset(defaults);
      setInitializedForm(true);
    }
  }, [defaults, form, initializedForm]);

  const { data: features } = api.features.list.useQuery();

  const createNodeDefWithFn = useEditorStore.use.setNodeDefWithFn();
  const mutationToasts = useMutationToasts();

  const createEventFeature = (values: FormType) => {
    const feature = features?.find((f) => f.id === values.featureId);
    if (!feature) throw new Error("Feature not found");
    const dataPath = form.getValues("dataPath");
    if (!dataPath) throw new Error("Data path not set");

    createNodeDefWithFn(FnType.LogEntityFeature, {
      id: generateNanoId(),
      eventType: eventType,
      name: "<no name>",
      inputs: {
        dataPath: dataPath,
        entityDataPath: form.getValues("entityDataPath"),
      },
      fn: {
        id: generateNanoId(),
        name: "Log Entity Feature",
        type: FnType.LogEntityFeature,
        returnSchema: {
          type: TypeName.Any,
        },
        config: {
          featureId: feature.id,
          featureSchema: feature.schema,
        },
      },
    })
      .then(mutationToasts.createNode.onSuccess)
      .catch(mutationToasts.createNode.onError)
      .catch(handleError);
  };

  const filteedFeatures =
    features?.filter((feature) => {
      const entitySchema = form.watch("entityDataPath")?.schema;
      if (entitySchema?.type === TypeName.Entity) {
        return feature.entityTypeId === entitySchema.entityType;
      }
      return true;
    }) ?? [];

  const selectedFeature = filteedFeatures.find(
    (f) => f.id === form.watch("featureId")
  );

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
                  name="dataPath"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormLabel>Assign data from:</FormLabel>
                      <FormControl>
                        <SelectDataPathOrEntityFeature
                          value={field.value}
                          onChange={(val) => {
                            console.log(val);
                            field.onChange(val);
                          }}
                          eventType={eventType}
                          desiredSchema={selectedFeature?.schema ?? undefined}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="featureId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>To feature:</FormLabel>
                    <ComboboxSelector
                      value={field.value}
                      onSelect={field.onChange}
                      options={
                        filteedFeatures.map((f) => ({
                          label: f.name,
                          value: f.id,
                        })) ?? []
                      }
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="entityDataPath"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Of entity:</FormLabel>
                    <FormControl>
                      <SelectDataPath
                        value={field.value ?? null}
                        onChange={(value) => {
                          form.setValue("featureId", "");
                          if (value) {
                            field.onChange(value);
                          } else {
                            field.onChange(undefined);
                          }
                        }}
                        desiredSchema={{
                          type: TypeName.Entity,
                        }}
                        eventType={eventType}
                      />
                    </FormControl>
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

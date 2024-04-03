import { zodResolver } from "@hookform/resolvers/zod";
import { TSchema, TypeName, tSchemaZod } from "event-processing";
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
import { api } from "~/utils/api";
import { SchemaBuilder } from "../SchemaBuilder";
import { useMutationToasts } from "./editor/useMutationToasts";
import { handleError } from "~/lib/handleError";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import CreateLabelsForm from "./CreateLabelsForm";
import { FeatureColor } from "./colors";

const formSchema = z.object({
  name: z.string(),
  entityTypeId: z.string(),
  schema: tSchemaZod,
  labels: z.array(
    z.object({ name: z.string().min(1), color: z.nativeEnum(FeatureColor) })
  ),
});

interface Props {
  title: string;
  entityTypeId?: string;
  children: React.ReactNode;
}

export const CreateFeatureDialog = ({
  title,
  entityTypeId,
  children,
}: Props) => {
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      entityTypeId,
      schema: {
        type: TypeName.String,
      },
      labels: [],
    },
  });
  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const { refetch: refetchFeatures } = api.features.list.useQuery(undefined, {
    enabled: false,
  });

  const { mutateAsync: createFeature } = api.features.create.useMutation();

  const toasts = useMutationToasts();

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
              void createFeature({
                name: values.name,
                entityTypeId: values.entityTypeId,
                schema: values.schema,
              })
                .then(toasts.createFeature.onSuccess)
                .then(() => refetchFeatures())
                .catch(toasts.createFeature.onError)
                .catch(handleError);

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
              {form.watch("schema.type") === TypeName.String && (
                <Accordion type="single" collapsible>
                  <AccordionItem value="item-1" className="border-none">
                    <AccordionTrigger className="text-sm">
                      Advanced Settings
                    </AccordionTrigger>

                    <AccordionContent>
                      <FormField
                        control={form.control}
                        name="labels"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Labels</FormLabel>
                            <FormControl>
                              <CreateLabelsForm
                                labels={form.watch("labels")}
                                onChange={form.setValue as any}
                              />
                            </FormControl>
                            {/* <FormMessage /> */}
                          </FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
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

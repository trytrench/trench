import { zodResolver } from "@hookform/resolvers/zod";
import { TypeName, tSchemaZod } from "event-processing";
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
import { SchemaBuilder } from "../SchemaBuilder";
import { api } from "~/utils/api";
import { useMutationToasts } from "./editor/useMutationToasts";

const formSchema = z.object({
  name: z.string(),
  schema: tSchemaZod,
});

interface Props {
  title: string;
  children: React.ReactNode;
  eventType: string;
}

export const CreateEventFeatureDialog = ({
  title,
  children,
  eventType,
}: Props) => {
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      schema: {
        type: TypeName.String,
      },
    },
  });

  const { mutateAsync: createEventFeature } =
    api.features.createEventFeature.useMutation();

  const { refetch: refetchFeatures } = api.features.list.useQuery(undefined, {
    enabled: false,
  });

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
              createEventFeature({
                name: values.name,
                schema: values.schema,
                eventTypeId: eventType,
              })
                .then(toasts.createEventFeature.onSuccess)
                .then(() => refetchFeatures())
                .catch(toasts.createEventFeature.onError);

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

import { zodResolver } from "@hookform/resolvers/zod";
import { FeatureDef, TypeName } from "event-processing";
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
import { handleError } from "~/lib/handleError";
import { api } from "~/utils/api";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import CreateLabelsForm from "./CreateLabelsForm";
import { useMutationToasts } from "./editor/useMutationToasts";
import { FeatureColor } from "./colors";

const formSchema = z.object({
  name: z.string(),
  labels: z.array(
    z.object({ name: z.string().min(1), color: z.nativeEnum(FeatureColor) })
  ),
});

interface Props {
  title: string;
  children: React.ReactNode;
  feature: FeatureDef;
}

export const EditFeatureDialog = ({ title, feature, children }: Props) => {
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: feature.name,
      labels: feature.metadata?.labels ?? [],
    },
  });

  const { refetch: refetchFeatures } = api.features.list.useQuery(undefined, {
    enabled: false,
  });

  const { mutateAsync: updateFeature } = api.features.update.useMutation();

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
              updateFeature({
                id: feature.id,
                name: values.name,
                metadata: values.labels.length
                  ? { labels: values.labels }
                  : undefined,
              })
                .then(toasts.updateFeature.onSuccess)
                .then(() => refetchFeatures())
                .catch(toasts.updateFeature.onError)
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
            </div>
            {feature.schema.type === TypeName.String && (
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

            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

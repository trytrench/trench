import { zodResolver } from "@hookform/resolvers/zod";
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
import { useMutationToasts } from "./editor/useMutationToasts";
import { FeatureDef } from "event-processing";

const formSchema = z.object({
  name: z.string(),
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
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

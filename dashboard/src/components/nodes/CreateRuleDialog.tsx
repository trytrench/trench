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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { api } from "~/utils/api";
import { useMutationToasts } from "./editor/useMutationToasts";
import { handleError } from "~/lib/handleError";

const formSchema = z.object({
  name: z.string(),
});

interface Props {
  title: string;
  children: React.ReactNode;
  eventTypeId?: string;
  entityTypeId?: string;
}

export const CreateRuleDialog = ({
  title,
  children,
  eventTypeId,
  entityTypeId,
}: Props) => {
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });
  const { mutateAsync: createRule } = api.rules.create.useMutation();

  const { refetch: refetchFeatures } = api.features.list.useQuery(undefined, {
    enabled: false,
  });

  const { refetch: refetchRules } = api.rules.list.useQuery(undefined, {
    enabled: false,
  });

  const [color, setColor] = useState("bg-gray-400");

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
              createRule({
                name: values.name,
                color,
                entityTypeId,
                eventTypeId,
              })
                .then(toasts.createRule.onSuccess)
                .then(() => {
                  void refetchFeatures();
                  return refetchRules();
                })
                .catch(toasts.createRule.onError)
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

              <div>
                <div className="text-sm font-medium mb-2">Color</div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <div className={`rounded-full ${color} w-3 h-3`}></div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="flex space-x-2">
                      {[
                        "bg-gray-400",
                        "bg-green-600",
                        "bg-yellow-300",
                        "bg-orange-400",
                        "bg-red-500",
                      ].map((color) => (
                        <div
                          key={color}
                          onClick={() => {
                            setColor(color);
                          }}
                          className={`rounded-full ${color} w-4 h-4`}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
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

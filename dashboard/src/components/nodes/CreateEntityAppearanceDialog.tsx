import { zodResolver } from "@hookform/resolvers/zod";
import { FnType, TypeName, dataPathZodSchema } from "event-processing";
import React, { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/utils/api";
import { generateNanoId } from "../../../../packages/common/src";
import { CreateEntityTypeDialog } from "./CreateEntityTypeDialog";
import { SelectDataPath } from "./SelectDataPath";
import { useEditorStore } from "./editor/state/zustand";
import { useMutationToasts } from "./editor/useMutationToasts";
import { handleError } from "~/lib/handleError";

const formSchema = z.object({
  entityTypeId: z.string(),
  path: dataPathZodSchema,
});

type FormType = z.infer<typeof formSchema>;

interface Props {
  title: string;
  children: React.ReactNode;
  defaults: Partial<FormType>;
  eventType: string;
}

export const CreateEntityAppearanceDialog = ({
  title,
  children,
  defaults,
  eventType,
}: Props) => {
  const [open, setOpen] = useState(false);
  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entityTypeId: "",
      path: {
        nodeId: "",
        path: [],
      },
    },
  });

  const [initializedForm, setInitializedForm] = useState(false);
  useEffect(() => {
    if (!initializedForm && defaults) {
      form.reset(defaults);
      setInitializedForm(true);
    }
  }, [defaults, form, initializedForm]);

  const toasts = useMutationToasts();
  const setNodeDefWithFn = useEditorStore.use.setNodeDefWithFn();

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
              const entityType = entityTypes?.find(
                (entityType) => entityType.id === values.entityTypeId
              );

              setNodeDefWithFn(FnType.EntityAppearance, {
                id: generateNanoId(),
                name: entityType?.type ?? "",
                eventType,
                inputs: {
                  dataPath: values.path,
                },
                fn: {
                  id: generateNanoId(),
                  type: FnType.EntityAppearance,
                  returnSchema: {
                    type: TypeName.Entity,
                    entityType: values.entityTypeId,
                  },
                  config: {
                    entityType: values.entityTypeId,
                  },
                  name: entityType?.type ?? "",
                },
              })
                .then(toasts.createNode.onSuccess)
                .catch(toasts.createNode.onError)
                .catch(handleError);

              setOpen(false);
              form.reset();
            })}
          >
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <FormField
                  control={form.control}
                  name="entityTypeId"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormLabel>Entity</FormLabel>
                      <div className="flex space-x-2">
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
                        <CreateEntityTypeDialog>
                          <Button variant="outline" size="sm">
                            Create
                          </Button>
                        </CreateEntityTypeDialog>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <FormField
                  control={form.control}
                  name="path"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormLabel>Path</FormLabel>
                      <FormControl>
                        <SelectDataPath
                          eventType={eventType}
                          onChange={field.onChange}
                          value={field.value}
                        />
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

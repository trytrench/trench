import { zodResolver } from "@hookform/resolvers/zod";
import { TypeName, FnType, getFnTypeDef } from "event-processing";
import { Save } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";

import { useToast } from "../../ui/use-toast";
import { handleError } from "../../../lib/handleError";
import { type NodeEditorProps } from "./types";
import { SelectDataPathOrEntityFeature } from "../SelectDataPathOrEntityFeature";
import { useMutationToasts } from "./useMutationToasts";
import { ComboboxSelector } from "../../ComboboxSelector";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { cn } from "../../../lib/utils";
import { selectors, useEditorStore } from "./state/zustand";
import { generateNanoId } from "../../../../../packages/common/src";

const fnTypeDef = getFnTypeDef(FnType.Blocklist);
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  inputs: fnTypeDef.inputSchema.partial(),
  listFnId: z.string().optional(),
});

type FormType = z.infer<typeof formSchema>;

export function EditBlocklist({ initialNodeId, eventType }: NodeEditorProps) {
  const isEditing = !!initialNodeId;

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      inputs: {
        stringDataPath: undefined,
      },
      listFnId: undefined,
    },
  });

  const { toast } = useToast();

  const initialNode = useEditorStore(
    selectors.getNodeDef(initialNodeId ?? "", FnType.Blocklist)
  );

  // Initialize form values with initial node
  const [initializedForm, setInitializedForm] = useState(false);
  useEffect(() => {
    if (!initializedForm && initialNode) {
      form.setValue("name", initialNode.name);
      form.setValue("inputs", initialNode.inputs as FormType["inputs"]);
      setInitializedForm(true);
    }
  }, [initialNode, initializedForm, setInitializedForm, form]);

  const toasts = useMutationToasts();
  const setNodeDef = useEditorStore.use.setNodeDef();

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-emphasis-foreground text-2xl mt-1 mb-4">
          {isEditing ? "Edit Node" : "Create Node"}
        </h1>

        <div className="flex gap-2 items-center">
          <Button
            onClick={(event) => {
              event.preventDefault();

              const fnId = form.getValues("listFnId");
              if (!fnId) {
                toast({
                  title: "Missing list",
                  description: "Please select a list.",
                });
                return;
              }

              setNodeDef({
                id: initialNode?.id ?? generateNanoId(),
                name: form.getValues("name"),
                eventType,
                inputs: form.getValues("inputs"),
                fnId: fnId,
              })
                .then(toasts.createNode.onSuccess)
                .then((res) => {
                  // void router.push(`/settings/event-types/${eventType}`);
                  return res;
                })
                .catch(toasts.createNode.onError)
                .catch(handleError);
            }}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {!isEditing && (
        <Form {...form}>
          <form>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="w-[16rem]">
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="listFnId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>List</FormLabel>
                  <FormControl>
                    <SelectBlocklist
                      value={field.value ?? null}
                      onChange={(newValue) => {
                        field.onChange(newValue ?? undefined);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="inputs.stringDataPath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>String to check</FormLabel>
                  <FormControl>
                    <SelectDataPathOrEntityFeature
                      desiredSchema={{ type: TypeName.String }}
                      eventType={eventType}
                      value={field.value ?? null}
                      onChange={(newValue) => {
                        field.onChange(newValue ?? undefined);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      )}
    </div>
  );
}

function SelectBlocklist({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (newValue: string | null) => void;
}) {
  const fns = useEditorStore(selectors.getFnDefs({ fnType: FnType.Blocklist }));

  return (
    <div className="flex items-center">
      <ComboboxSelector
        value={value}
        onSelect={onChange}
        options={
          fns?.map((fn) => ({
            label: fn.name,
            value: fn.id,
          })) ?? []
        }
      />
      <UpdateBlocklist blocklistFnId={value} />
    </div>
  );
}

function UpdateBlocklist(props: { blocklistFnId: string | null }) {
  const { blocklistFnId } = props;
  const [open, setOpen] = useState(false);

  const fnDef = useEditorStore(
    selectors.getFnDef(blocklistFnId ?? "", FnType.Blocklist)
  );
  const [listName, setListName] = useState<string>("");
  const [listStr, setListStr] = useState<string>("");

  const reset = useCallback(() => {
    if (fnDef) {
      if (fnDef.type === FnType.Blocklist) {
        setListStr(fnDef.config.list.join("\n"));
        setListName(fnDef.name);
      }
    } else {
      setListStr("");
      setListName("");
    }
  }, [fnDef]);

  useEffect(() => {
    if (open) reset();
  }, [reset, open]);

  const setFnDef = useEditorStore.use.setFnDef();
  const toasts = useMutationToasts();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{blocklistFnId ? "Update list" : "Create list"}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update list</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="edit">
          <div className="flex justify-between">
            <TabsList>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <Button
              size="sm"
              onClick={() => {
                setFnDef(FnType.Blocklist, {
                  id: blocklistFnId ?? generateNanoId(),
                  name: listName,
                  type: FnType.Blocklist,
                  config: {
                    list: listStr.split("\n"),
                  },
                  returnSchema: {
                    type: TypeName.Boolean,
                  },
                })
                  .then(toasts.createFunction.onSuccess)
                  .then((res) => {
                    setOpen(false);
                    return res;
                  })
                  .catch(toasts.createFunction.onError)
                  .catch(handleError);
              }}
            >
              {blocklistFnId ? "Update list" : "Create list"}
            </Button>
          </div>
          <TabsContent value="edit">
            <Input
              placeholder="List name"
              value={listName}
              onChange={(e) => {
                setListName(e.target.value);
              }}
            />
            <div className="h-4"></div>
            <textarea
              placeholder="Enter one item per line"
              className="w-full h-64 border"
              value={listStr}
              onChange={(e) => {
                setListStr(e.target.value);
              }}
            />
          </TabsContent>
          <TabsContent value="preview">
            <div>
              <div className="text-lg font-bold">List: {listName}</div>
              <div className="h-64 overflow-y-scroll">
                {listStr.split("\n").map((line, i) => (
                  <div
                    key={i}
                    className={cn({
                      "bg-gray-100": i % 2 === 0,
                    })}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

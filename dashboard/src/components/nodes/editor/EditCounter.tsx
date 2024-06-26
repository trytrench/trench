import { zodResolver } from "@hookform/resolvers/zod";
import { TypeName, FnType, getFnTypeDef } from "event-processing";
import { Plus, Save } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
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
import { NodeEditorProps } from "./types";
import { SelectDataPath } from "../SelectDataPath";
import { SelectDataPathList } from "../SelectDataPathList";
import { TimeWindowDialog, RenderTimeWindow } from "./TimeWindowDialog";
import { useMutationToasts } from "./useMutationToasts";
import { handleError } from "../../../lib/handleError";
import { selectors, useEditorStore } from "./state/zustand";
import { generateNanoId } from "../../../../../packages/common/src";
import { SelectDataPathOrEntityFeature } from "../SelectDataPathOrEntityFeature";

const fnTypeDef = getFnTypeDef(FnType.Counter);
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  config: fnTypeDef.configSchema,
  inputs: fnTypeDef.inputSchema,
});

type FormType = z.infer<typeof formSchema>;

export function EditCounter({
  initialNodeId,
  eventType,
  onSaveSuccess,
}: NodeEditorProps) {
  const isEditing = !!initialNodeId;

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      config: {
        timeWindow: {
          value: 1,
          unit: "minutes",
        },
        countByArgs: [],
      },
      inputs: {
        countByDataPaths: [],
        conditionDataPath: undefined,
      },
    },
  });

  const initialNode = useEditorStore(selectors.getNodeDef(initialNodeId ?? ""));

  // Initialize form values with initial node
  const [initializedForm, setInitializedForm] = useState(false);
  useEffect(() => {
    if (!initializedForm && initialNode) {
      form.setValue("name", initialNode.name);
      form.setValue("config", initialNode.fn.config as FormType["config"]);
      form.setValue("inputs", initialNode.inputs as FormType["inputs"]);

      setInitializedForm(true);
    }
  }, [initialNode, initializedForm, setInitializedForm, form]);

  const isFormValid = form.formState.isValid;

  const toasts = useMutationToasts();
  const createNodeWithFn = useEditorStore.use.setNodeDefWithFn();

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-emphasis-foreground text-2xl mt-1 mb-4">
          {isEditing ? "Edit Node" : "Create Node"}
        </h1>

        <div className="flex gap-2 items-center">
          <Button
            disabled={!isFormValid}
            onClick={(event) => {
              event.preventDefault();

              createNodeWithFn(FnType.Counter, {
                id: initialNode?.id ?? generateNanoId(),
                name: form.getValues("name"),
                eventType: eventType,
                inputs: form.getValues("inputs"),
                fn: {
                  id: initialNode?.fn.id ?? generateNanoId(),
                  name: form.getValues("name"),
                  type: FnType.Counter,
                  config: form.getValues("config"),
                  returnSchema: {
                    type: TypeName.Int64,
                  },
                },
              })
                .then(toasts.createNode.onSuccess)
                .then((res) => {
                  onSaveSuccess();
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

      <>
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
          </form>
        </Form>

        <div className="text-sm mt-6 mb-2">
          Count the number of <span>{eventType}</span> events...
        </div>

        <div className="text-sm font-medium mt-2 mb-2">Seen with this...</div>
        <SelectDataPathList
          args={form.watch("config.countByArgs")}
          onArgsChange={(countByArgs) =>
            form.setValue("config.countByArgs", countByArgs)
          }
          eventType={eventType}
          value={form.watch("inputs.countByDataPaths")}
          onChange={(countByDataPaths) =>
            form.setValue("inputs.countByDataPaths", countByDataPaths)
          }
        />
        <div className="text-sm font-medium mt-5 mb-2">
          Matching the condition:
        </div>

        <SelectDataPathOrEntityFeature
          eventType={eventType}
          desiredSchema={{
            type: TypeName.Boolean,
          }}
          value={form.watch("inputs.conditionDataPath") ?? null}
          onChange={(conditionDataPath) => {
            if (conditionDataPath) {
              form.setValue("inputs.conditionDataPath", conditionDataPath);
            } else {
              form.setValue("inputs.conditionDataPath", undefined);
            }
          }}
        />

        <div className="text-sm font-medium mt-5 mb-2">In the last:</div>

        <TimeWindowDialog
          value={form.watch("config.timeWindow")}
          onSubmit={(timeWindow) =>
            form.setValue("config.timeWindow", timeWindow)
          }
        >
          <div className="flex items-center text-sm">
            <RenderTimeWindow value={form.watch("config.timeWindow")} />
            <Button variant="outline" size="xs" className="ml-2">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </TimeWindowDialog>
      </>
    </div>
  );
}

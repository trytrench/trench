import { zodResolver } from "@hookform/resolvers/zod";
import {
  TypeName,
  getConfigSchema,
  FnType,
  getInputSchema,
  buildNodeDefWithFn,
} from "event-processing";
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
import { api } from "../../../utils/api";
import { SelectDataPath } from "../SelectDataPath";
import { SelectDataPathList } from "../SelectDataPathList";
import { TimeWindowDialog, RenderTimeWindow } from "./TimeWindowDialog";
import { useMutationToasts } from "./useMutationToasts";
import { handleError } from "../../../lib/handleError";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  config: getConfigSchema(FnType.UniqueCounter),
  inputs: getInputSchema(FnType.UniqueCounter),
});

type FormType = z.infer<typeof formSchema>;

export function EditUniqueCounter({ initialNodeId }: NodeEditorProps) {
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
        countArgs: [],
      },
      inputs: {
        countByDataPaths: [],
        countDataPaths: [],
        conditionDataPath: undefined,
      },
    },
  });

  const router = useRouter();
  const eventType = router.query.eventType as string;

  const { data: nodes } = api.nodeDefs.list.useQuery({ eventType });
  const { data: thisNode } = api.nodeDefs.get.useQuery(
    { id: initialNodeId ?? "" },
    { enabled: !!initialNodeId }
  );

  // Initialize form values with initial node
  const [initializedForm, setInitializedForm] = useState(false);
  useEffect(() => {
    if (!initializedForm && thisNode) {
      form.setValue("name", thisNode.name);
      form.setValue("config", thisNode.fn.config as FormType["config"]);

      setInitializedForm(true);
    }
  }, [thisNode, initializedForm, setInitializedForm, form]);

  const isFormValid = form.formState.isValid;

  const toasts = useMutationToasts();
  const { mutateAsync: createNodeWithFn } =
    api.nodeDefs.createWithFn.useMutation();

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

              const nodeDef = buildNodeDefWithFn(FnType.UniqueCounter, {
                name: "Unique Counter",
                eventType: eventType,
                inputs: form.getValues("inputs"),
                fn: {
                  name: "Unique Counter",
                  type: FnType.UniqueCounter,
                  config: form.getValues("config"),
                  returnSchema: {
                    type: TypeName.Int64,
                  },
                },
              });

              createNodeWithFn(nodeDef)
                .then(toasts.createNode.onSuccess)
                .catch(toasts.createNode.onError)
                .then(() => router.push(`/events/${eventType}`))
                .catch(handleError);
            }}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {!isEditing && (
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

<<<<<<< HEAD
          <div className="text-md font-bold mt-4 mb-2">Count</div>

          <SelectDataPathList
            args={form.watch("config.countArgs")}
            onArgsChange={(countArgs) =>
              form.setValue("config.countArgs", countArgs)
            }
            eventType={eventType}
            value={form.watch("inputs.countDataPaths")}
            onChange={(countDataPaths) =>
              form.setValue("inputs.countDataPaths", countDataPaths)
=======
          <div className="text-md font-bold mt-4 mb-2">Count Unique</div>
          <SelectDataPathList
            eventType={eventType}
            value={form.watch("config.countDataPaths")}
            onChange={(countDataPaths) =>
              form.setValue("config.countDataPaths", countDataPaths)
>>>>>>> origin/bowen/frontend
            }
          />

          <div className="text-md font-bold mt-4 mb-2">By</div>
          <SelectDataPathList
<<<<<<< HEAD
            args={form.watch("config.countByArgs")}
            onArgsChange={(countByArgs) =>
              form.setValue("config.countByArgs", countByArgs)
            }
            eventType={eventType}
            value={form.watch("inputs.countByDataPaths")}
            onChange={(countByDataPaths) =>
              form.setValue("inputs.countByDataPaths", countByDataPaths)
=======
            eventType={eventType}
            value={form.watch("config.countByDataPaths")}
            onChange={(countByDataPaths) =>
              form.setValue("config.countByDataPaths", countByDataPaths)
>>>>>>> origin/bowen/frontend
            }
          />
          <div className="text-md font-bold mt-4 mb-2">Where</div>

          <SelectDataPath
            eventType={eventType}
            desiredSchema={{
              type: TypeName.Boolean,
            }}
<<<<<<< HEAD
            value={form.watch("inputs.conditionDataPath") ?? null}
            onChange={(conditionDataPath) => {
              if (conditionDataPath) {
                form.setValue("inputs.conditionDataPath", conditionDataPath);
              } else {
                form.setValue("inputs.conditionDataPath", undefined);
=======
            value={form.watch("config.conditionDataPath") ?? null}
            onChange={(conditionDataPath) => {
              if (conditionDataPath) {
                form.setValue("config.conditionDataPath", conditionDataPath);
              } else {
                form.setValue("config.conditionDataPath", undefined);
>>>>>>> origin/bowen/frontend
              }
            }}
          />

          <div className="text-md">is true</div>

          <div className="text-md font-bold mt-4 mb-2">In the last</div>

          <TimeWindowDialog
<<<<<<< HEAD
            value={form.watch("config.timeWindow")}
            onSubmit={(timeWindow) =>
              form.setValue("config.timeWindow", timeWindow)
            }
          >
            <div className="flex items-center">
              <RenderTimeWindow value={form.watch("config.timeWindow")} />
=======
            value={form.watch("config.uniqueCounter.timeWindow")}
            onSubmit={(timeWindow) =>
              form.setValue("config.uniqueCounter.timeWindow", timeWindow)
            }
          >
            <div className="flex items-center">
              <RenderTimeWindow
                value={form.watch("config.uniqueCounter.timeWindow")}
              />
>>>>>>> origin/bowen/frontend
              <Button variant="outline" size="xs">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </TimeWindowDialog>
        </>
      )}
    </div>
  );
}

import { zodResolver } from "@hookform/resolvers/zod";
import {
  NodeType,
  TypeName,
  buildNodeDef,
  getConfigSchema,
} from "event-processing";
import { Plus, Save } from "lucide-react";
import { nanoid } from "nanoid";
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
import { handleError } from "~/lib/handleError";
import { api } from "../../../utils/api";
import { SelectDataPath } from "../SelectDataPath";
import { SelectDataPathList } from "../SelectDataPathList";
import { RenderTimeWindow, TimeWindowDialog } from "./TimeWindowDialog";
import { NodeEditorProps } from "./types";
import { useMutateNode } from "./useMutateNode";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  config: getConfigSchema(NodeType.UniqueCounter),
});

type FormType = z.infer<typeof formSchema>;

export function EditUniqueCounter({ initialNodeId }: NodeEditorProps) {
  const isEditing = !!initialNodeId;

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      config: {
        uniqueCounter: {
          id: nanoid(),
          timeWindow: {
            value: 1,
            unit: "minutes",
          },
        },
        countDataPaths: [],
        countByDataPaths: [],
        conditionDataPath: undefined,
      },
    },
  });

  const router = useRouter();
  const eventType = router.query.eventType as string;

  const { data: thisNode } = api.nodeDefs.get.useQuery(
    { id: initialNodeId ?? "" },
    { enabled: !!initialNodeId }
  );

  // Initialize form values with initial node
  const [initializedForm, setInitializedForm] = useState(false);
  useEffect(() => {
    if (!initializedForm && thisNode) {
      form.setValue("name", thisNode.name);
      form.setValue("config", thisNode.config as FormType["config"]);
      setInitializedForm(true);
    }
  }, [thisNode, initializedForm, setInitializedForm, form]);

  const isFormValid = form.formState.isValid;

  const {
    create: { mutateAsync: createNodeDef },
    update: { mutateAsync: updateNodeDef },
  } = useMutateNode();

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

              const counterNodeDef = buildNodeDef(NodeType.UniqueCounter, {
                ...form.getValues(),
                eventType: eventType,
                type: NodeType.UniqueCounter,
                returnSchema: {
                  type: TypeName.Int64,
                },
              });

              if (isEditing && initialNodeId) {
                updateNodeDef({
                  id: initialNodeId,
                  ...counterNodeDef,
                })
                  .then(() => {
                    void router.push(`/settings/event-types/${eventType}`);
                  })
                  .catch(handleError);
              } else {
                createNodeDef(counterNodeDef)
                  .then(() => {
                    void router.push(`/settings/event-types/${eventType}`);
                  })
                  .catch(handleError);
              }
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

          <div className="text-md font-bold mt-4 mb-2">Count Unique</div>
          <SelectDataPathList
            eventType={eventType}
            value={form.watch("config.countDataPaths")}
            onChange={(countDataPaths) =>
              form.setValue("config.countDataPaths", countDataPaths)
            }
          />

          <div className="text-md font-bold mt-4 mb-2">By</div>
          <SelectDataPathList
            eventType={eventType}
            value={form.watch("config.countByDataPaths")}
            onChange={(countByDataPaths) =>
              form.setValue("config.countByDataPaths", countByDataPaths)
            }
          />
          <div className="text-md font-bold mt-4 mb-2">Where</div>

          <SelectDataPath
            eventType={eventType}
            desiredSchema={{
              type: TypeName.Boolean,
            }}
            value={form.watch("config.conditionDataPath") ?? null}
            onChange={(conditionDataPath) => {
              if (conditionDataPath) {
                form.setValue("config.conditionDataPath", conditionDataPath);
              } else {
                form.setValue("config.conditionDataPath", undefined);
              }
            }}
          />

          <div className="text-md">is true</div>

          <div className="text-md font-bold mt-4 mb-2">In the last</div>

          <TimeWindowDialog
            value={form.watch("config.uniqueCounter.timeWindow")}
            onSubmit={(timeWindow) =>
              form.setValue("config.uniqueCounter.timeWindow", timeWindow)
            }
          >
            <div className="flex items-center">
              <RenderTimeWindow
                value={form.watch("config.uniqueCounter.timeWindow")}
              />
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

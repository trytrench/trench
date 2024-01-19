import { zodResolver } from "@hookform/resolvers/zod";
import {
  TypeName,
  type NodeDef,
  getConfigSchema,
  NodeType,
} from "event-processing";
import { Pencil, Plus, Save } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
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
import FeatureAssignSelector from "./old/FeatureAssignSelector";
import { type FeatureDep } from "./old/NodeDepSelector";
import { NodeEditorProps } from "./types";
import { api } from "../../../utils/api";
import { nanoid } from "nanoid";
import config from "next/config";
import { SelectDataPath } from "../SelectDataPath";
import { SelectDataPathList } from "../SelectDataPathList";
import { TimeWindowDialog, RenderTimeWindow } from "./TimeWindowDialog";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  config: getConfigSchema(NodeType.Counter),
});

type FormType = z.infer<typeof formSchema>;

export function EditCounter({ initialNodeId }: NodeEditorProps) {
  const isEditing = !!initialNodeId;

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      config: {
        counter: {
          id: nanoid(),
          timeWindow: {
            value: 1,
            unit: "minutes",
          },
        },
        countByDataPaths: [],
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
      form.setValue("config", thisNode.config as FormType["config"]);
      setInitializedForm(true);
    }
  }, [thisNode, initializedForm, setInitializedForm, form]);

  const isFormValid = form.formState.isValid;

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

          <div className="text-md font-bold mt-4 mb-2">Count</div>

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
            value={form.watch("config.counter.timeWindow")}
            onSubmit={(timeWindow) =>
              form.setValue("config.counter.timeWindow", timeWindow)
            }
          >
            <div className="flex items-center">
              <RenderTimeWindow
                value={form.watch("config.counter.timeWindow")}
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

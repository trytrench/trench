import { zodResolver } from "@hookform/resolvers/zod";
import { type NodeDef, FeatureDef } from "event-processing";
import { ChevronsUpDown, Pencil, Save } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
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
import { Separator } from "~/components/ui/separator";
import FeatureAssignSelector from "~/pages/settings/event-types/[eventType]/node/FeatureAssignSelector";
import {
  FeatureDep,
  NodeDepSelector,
} from "~/pages/settings/event-types/[eventType]/node/NodeDepSelector";
import { api } from "~/utils/api";
import {
  EventTypeNodesSchemaDisplay,
  SchemaDisplay,
  useDepsSchema,
  useDepsTypes,
} from "../../../../../components/features/SchemaDisplay";
import {
  CodeEditor,
  CompileStatus,
  CompileStatusMessage,
} from "../../../../../components/features/shared/CodeEditor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../../../components/ui/dialog";
import { featureDefSchema, nodeDefSchema } from "./EditComputed";

const FUNCTION_TEMPLATE = `const getValue: ValueGetter = async (input) => {\n\n}`;

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  featureDeps: z.array(
    z.object({
      feature: featureDefSchema,
      node: nodeDefSchema,
    })
  ),
  nodeDeps: z.array(nodeDefSchema),
});

interface Props {
  initialNodeDef?: NodeDef;
  onRename: (name: string) => void;
  onSave: (
    data: NodeDef,
    assignToFeatures: FeatureDep[],
    featureDeps: FeatureDep[],
    nodeDeps: NodeDef[],
    assignToEvent: boolean
  ) => void;
}

export function EditRule({ initialNodeDef, onSave, onRename }: Props) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      featureDeps: [],
      nodeDeps: [],
    },
  });

  const router = useRouter();

  const { data: features } = api.features.list.useQuery();
  const { data: nodes } = api.nodeDefs.list.useQuery({
    eventType: router.query.eventType as string,
  });

  const [config, setConfig] = useState(
    initialNodeDef?.config ?? {
      code: "",
      depsMap: {},
    }
  );

  const [isCodeValid, setIsCodeValid] = useState(false);

  const [assignToFeatures, setAssignToFeatures] = useState<FeatureDep[]>([]);

  const [assignToEventFeature, setAssignToEventFeature] =
    useState<FeatureDef | null>(null);

  const isValid = useMemo(
    () => form.formState.isValid && isCodeValid,
    [form.formState.isValid, isCodeValid]
  );

  const isEditing = useMemo(() => !!initialNodeDef, [initialNodeDef]);

  const [compileStatus, setCompileStatus] = useState<CompileStatus>({
    status: "empty",
    code: "",
  });

  const [showSchema, setShowSchema] = useState(false);

  const [color, setColor] = useState("bg-gray-400");

  const inputType = `interface Input {\n  event: TrenchEvent;\n  deps: Dependencies;\n}`;
  const functionType = `type ValueGetter = (input: Input) => Promise<boolean>;`;
  const depsType = useDepsTypes(
    // TODO: Convert between nodeDef schema and type
    form.watch("nodeDeps"),
    form.watch("featureDeps")
  );

  const deps = useDepsSchema(form.watch("nodeDeps"), form.watch("featureDeps"));

  const onCompileStatusChange = useCallback(
    (compileStatus: CompileStatus) => {
      setCompileStatus(compileStatus);

      if (compileStatus.status === "success") {
        setIsCodeValid(true);
        setConfig((config) => ({
          ...config,
          tsCode: compileStatus.code,
          compiledJs: compileStatus.compiled
            .slice(compileStatus.compiled.indexOf("async"))
            .replace(/[;\n]+$/, ""),
        }));
      } else {
        setConfig((config) => ({
          ...config,
          tsCode: compileStatus.code,
          compiledJs: undefined,
        }));
        setIsCodeValid(false);
      }
    },
    [setCompileStatus]
  );

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-emphasis-foreground text-2xl mt-1 mb-4">
          {isEditing ? initialNodeDef.name : "Create Node"}
        </h1>

        <div className="flex gap-2 items-center">
          {isEditing && (
            // TODO: Fix this
            <RenameDialog
              name={name}
              onRename={(newName) => {
                onRename?.(newName);
                updateFeatureDef({ name: newName });
              }}
            />
          )}
          <Button
            disabled={!isValid}
            onClick={(event) => {
              event.preventDefault();

              // TODO: Clean this up
              onSave(
                {
                  ...initialNodeDef,
                  name: form.getValues("name"),
                  config: {
                    ...config,
                    depsMap: {},
                  },
                },
                assignToFeatures,
                form.getValues("featureDeps"),
                form.getValues("nodeDeps"),
                assignToEventFeature
              );
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

            <div className="text-sm font-medium mt-4 mb-2">Dependencies</div>

            <div className="flex space-x-2 mt-2">
              <NodeDepSelector
                nodes={nodes ?? []}
                features={features ?? []}
                nodeDeps={form.watch("nodeDeps")}
                featureDeps={form.watch("featureDeps")}
                onFeatureDepsChange={(deps) =>
                  form.setValue("featureDeps", deps)
                }
                onNodeDepsChange={(deps) => form.setValue("nodeDeps", deps)}
                eventType={router.query.eventType as string}
              />
            </div>
          </form>
        </Form>
      )}

      <div className="text-sm font-medium mt-4 mb-2">Assign</div>

      <div className="flex items-center space-x-2 mt-2">
        <FeatureAssignSelector
          features={assignToFeatures}
          onFeaturesChange={setAssignToFeatures}
          eventFeature={assignToEventFeature}
          onEventFeatureChange={setAssignToEventFeature}
        />
      </div>

      <div className="text-sm font-medium mt-4 mb-2">Color</div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <div className={`rounded-full ${color} w-2 h-2`}></div>
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

      {/* <EventTypes
        eventTypes={eventTypes}
        onChange={(v) => {
          updateFeatureDef({ eventTypes: v });
        }}
      /> */}

      <Separator className="my-8" />

      <div className="flex mb-4 items-center">
        <div className="text-emphasis-foreground text-md">Code</div>
        <Button
          variant="outline"
          size="sm"
          className="ml-4"
          onClick={() => setShowSchema(!showSchema)}
        >
          Schema
          <ChevronsUpDown className="w-4 h-4 ml-1" />
        </Button>
        <div className="ml-auto" />
        <CompileStatusMessage compileStatus={compileStatus} />
      </div>

      {showSchema && (
        <Card className="h-96 overflow-auto p-6 mb-4">
          <EventTypeNodesSchemaDisplay
            basePath="input.event.data"
            baseName="event.data"
            eventType={router.query.eventType as string}
          />
          <SchemaDisplay name="deps" path="input.deps" info={deps} />
        </Card>
      )}

      <div className="h-96">
        <CodeEditor
          typeDefs={[depsType, inputType, functionType].join("\n\n")}
          initialCode={config?.tsCode ?? FUNCTION_TEMPLATE}
          onCompileStatusChange={onCompileStatusChange}
        />
      </div>
    </div>
  );
}

function RenameDialog(props: {
  name?: string;
  onRename: (name: string) => void;
}) {
  const { name, onRename } = props;

  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState(name ?? "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          {/* todo */}
          <Pencil className="w-4 h-4" /> Rename
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename</DialogTitle>
          <DialogDescription>
            Names are not tied to versioning. The name change applies
            immediately.
          </DialogDescription>
        </DialogHeader>
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onRename(newName);
              setOpen(false);
            }}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

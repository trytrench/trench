import { zodResolver } from "@hookform/resolvers/zod";
import { NodeType, TypeName, type NodeDef } from "event-processing";
import { Pencil, Save } from "lucide-react";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { EditComputed } from "~/components/features/feature-types/EditComputed";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { NodeDepSelector } from "~/pages/settings/event-types/[eventTypeId]/node/NodeDepSelector";

const DATA_TYPE_OPTIONS = [
  {
    label: "String",
    value: TypeName.String,
  },
  {
    label: "Number",
    value: TypeName.Float64,
  },
  {
    label: "Boolean",
    value: TypeName.Boolean,
  },
  {
    label: "JSON",
    value: TypeName.Object,
  },
];

const TYPE_DEFAULTS = {
  [NodeType.Computed]: {
    dataType: TypeName.Boolean,
    config: {
      code: "",
      depsMap: {},
      assignedEntityFeatureIds: [],
    },
  },
  [NodeType.Counter]: {
    dataType: TypeName.Int64,
    config: {
      timeWindow: {
        number: 1,
        unit: "hours",
      },
      countByFeatureIds: [],
      conditionFeatureId: undefined,
    }, // as FeatureDefs[FeatureType.Count]["config"],
  },
  [NodeType.UniqueCounter]: {
    dataType: TypeName.Int64,
    config: {
      timeWindow: {
        number: 1,
        unit: "hours",
      },
      countByFeatureIds: [],
      countUniqueFeatureIds: [],
      conditionFeatureId: undefined,
    }, // as FeatureDefs[FeatureType.UniqueCount]["config"],
  },
  [NodeType.LogEntityFeature]: {
    dataType: TypeName.Entity,
    config: {
      eventTypes: new Set(),
      code: "",
      depsMap: {},
    },
  },
} as Record<
  NodeType,
  {
    dataType: TypeName;
    config: any;
  }
>;

//

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  dataType: z.nativeEnum(TypeName),
  featureDeps: z.array(
    z.object({
      featureId: z.string(),
      featureName: z.string(),
      nodeId: z.string(),
      nodeName: z.string(),
    })
  ),
  nodeDeps: z.array(
    z.object({
      nodeId: z.string(),
      nodeName: z.string(),
    })
  ),
});

interface Props {
  initialNodeDef?: NodeDef;
  onRename: (name: string) => void;
  onSave: (data: NodeDef) => void;
}

export function EditNodeDef({ initialNodeDef, onSave, onRename }: Props) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      dataType: TypeName.String,
      featureDeps: [],
      nodeDeps: [],
    },
  });

  const router = useRouter();

  const [config, setConfig] = useState(
    initialNodeDef?.config ?? {
      code: "",
      depsMap: {},
    }
  );

  // // If we're editing an existing feature then populate forms w/ data.
  // // Name, type, and datatype can't be changed after creation so the
  // // fields are disabled.
  // const isEditingExistingFeature = !!initialDef;

  // const [featureDef, setFeatureDef] = useState<Partial<NodeDef>>(
  //   initialDef ?? {
  //     // defaults for some fields
  //     name: "",
  //     eventTypes: new Set(),
  //     dependsOn: new Set(),
  //     type: NodeType.Computed,
  //     dataType: DataType.Boolean,
  //     config: TYPE_DEFAULTS[NodeType.Computed].config,
  //   }
  // );
  // const updateFeatureDef = (data: Partial<NodeDef>) => {
  //   if (!featureDef) return;
  //   setFeatureDef({ ...featureDef, ...data });
  // };

  // // Whether or not the featureType-specific config is valid
  const [isCodeValid, setIsCodeValid] = useState(false);

  // const everythingValid = useMemo(() => {
  //   return (
  //     featureDef?.name &&
  //     featureDef?.type &&
  //     featureDef?.dataType &&
  //     typeDetailsValid
  //   );
  // }, [featureDef, typeDetailsValid]);

  // const save = () => {
  //   if (!featureDef || !everythingValid) return;
  //   // TODO: validate that featureDef is a complete NodeDef
  //   onFeatureDefSave?.(featureDef as NodeDef);
  // };

  // TEMP

  // const { name, type, dataType, eventTypes, config } = featureDef ?? {};

  const isValid = useMemo(
    () => form.formState.isValid && isCodeValid,
    [form.formState.isValid, isCodeValid]
  );

  const isEditing = useMemo(() => !!initialNodeDef, [initialNodeDef]);

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-emphasis-foreground text-2xl mt-1 mb-4">
          {isEditing ? initialNodeDef.name : "Create Node"}
        </h1>

        <div className="flex gap-2 items-center">
          {isEditing && (
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

              onSave({
                ...initialNodeDef,
                name: form.getValues("name"),
                // dataType: form.getValues("dataType"),
                config: {
                  ...config,
                  depsMap: {},
                },
              });
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
              name="dataType"
              render={({ field }) => (
                <FormItem className="w-[16rem] mt-4">
                  <FormLabel>Type</FormLabel>
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
                      {DATA_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="text-sm font-medium mt-4 mb-2">Dependencies</div>

            <div className="flex space-x-2 mt-2">
              <NodeDepSelector
                nodeDeps={form.watch("nodeDeps")}
                featureDeps={form.watch("featureDeps")}
                onFeatureDepsChange={(deps) =>
                  form.setValue("featureDeps", deps)
                }
                onNodeDepsChange={(deps) => form.setValue("nodeDeps", deps)}
                eventTypeId={router.query.eventTypeId as string}
              />
            </div>
          </form>
        </Form>
      )}

      {/* <EventTypes
        eventTypes={eventTypes}
        onChange={(v) => {
          updateFeatureDef({ eventTypes: v });
        }}
      /> */}

      <Separator className="my-8" />

      <EditComputed
        nodeDef={
          initialNodeDef ?? {
            returnSchema: {},
            config: {
              code: "",
              depsMap: {},
            },
          }
        }
        onConfigChange={setConfig}
        onValidChange={setIsCodeValid}
      />
    </div>
  );
}

//

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

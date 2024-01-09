import { useMemo, useState } from "react";

import { DataType, NodeType, type NodeDef } from "event-processing";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Pencil, Save } from "lucide-react";
import { EditComputed } from "~/components/features/feature-types/EditComputed";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const DATA_TYPE_OPTIONS = [
  {
    label: "String",
    value: DataType.String,
  },
  {
    label: "Number",
    value: DataType.Float64,
  },
  {
    label: "Boolean",
    value: DataType.Boolean,
  },
  {
    label: "JSON",
    value: DataType.Object,
  },
];

const TYPE_DEFAULTS = {
  [NodeType.Computed]: {
    dataType: DataType.Boolean,
    config: {
      code: "",
      depsMap: {},
      assignedEntityFeatureIds: [],
    },
  },
  [NodeType.Counter]: {
    dataType: DataType.Int64,
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
    dataType: DataType.Int64,
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
    dataType: DataType.Entity,
    config: {
      eventTypes: new Set(),
      code: "",
      depsMap: {},
    },
  },
} as Record<
  NodeType,
  {
    dataType: DataType;
    config: any;
  }
>;

//

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  dataType: z.nativeEnum(DataType),
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
      dataType: DataType.String,
    },
  });

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

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-emphasis-foreground text-2xl mt-1 mb-4">
          {initialNodeDef ? initialNodeDef.name : "Create Node"}
        </h1>

        <div className="flex gap-2 items-center">
          {initialNodeDef && (
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
                dataType: form.getValues("dataType"),
                config,
              });
            }}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {!initialNodeDef && (
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
                  <FormLabel>Entity Type</FormLabel>
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
            dataType: form.watch("dataType"),
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

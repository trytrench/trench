import { zodResolver } from "@hookform/resolvers/zod";
import {
  TSchema,
  TypeName,
  createDataType,
  NodeType,
  getNodeDefSchema,
  getConfigSchema,
  tSchemaZod,
  dataPathZodSchema,
  buildNodeDef,
  DataPath,
} from "event-processing";
import { Pencil, Plus, Save } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Separator } from "~/components/ui/separator";
import { SchemaBuilder } from "../../SchemaBuilder";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import {
  CodeEditor,
  CompileStatus,
  CompileStatusMessage,
} from "../../features/shared/CodeEditor";
import { api } from "~/utils/api";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import libSource from "!!raw-loader?esModule=false!./nodeDefLib.ts";
import { EditableProperty } from "../../EditableProperty";
import { useToast } from "../../ui/use-toast";
import { ComboboxSelector } from "../../ComboboxSelector";
import { handleError } from "../../../lib/handleError";
import { useMutateNode } from "./useMutateNode";
import { NodeEditorProps } from "./types";
import { SelectDataPathOrEntityFeature } from "../SelectDataPathOrEntityFeature";

const FUNCTION_TEMPLATE = `const getValue: ValueGetter = async (input) => {\n\n}`;

const formSchema = z.object({
  returnSchema: tSchemaZod,
  name: z.string().min(2, "Name must be at least 2 characters long."),
  config: getConfigSchema(NodeType.Computed)
    .omit({
      depsMap: true,
    })
    .merge(
      z.object({
        depsMap: z.record(z.string(), dataPathZodSchema.nullable()),
      })
    ),
});

type FormType = z.infer<typeof formSchema>;

export function EditComputed({ initialNodeId }: NodeEditorProps) {
  const isEditing = !!initialNodeId;

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      returnSchema: {
        type: TypeName.String,
      },
      config: {
        depsMap: {},
        tsCode: "",
        compiledJs: "",
      },
    },
  });

  const { toast } = useToast();
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
      form.setValue("returnSchema", thisNode.returnSchema);
      form.setValue("config", thisNode.config as FormType["config"]);
      setInitializedForm(true);
    }
  }, [thisNode, initializedForm, setInitializedForm, form]);

  // Initialize Deps Map with event node
  const [initializedEventDep, setInitializedEventNode] = useState(false);
  useEffect(() => {
    if (!initializedEventDep && nodes) {
      const eventNode = nodes.find((n) => n.type === NodeType.Event);
      if (eventNode) {
        form.setValue("config.depsMap", {
          event: {
            nodeId: eventNode.id,
            path: [],
            schema: eventNode.returnSchema,
          },
        });
        setInitializedEventNode(true);
      }
    }
  }, [nodes, initializedEventDep, setInitializedEventNode, form]);

  // Code validity
  const [compileStatus, setCompileStatus] = useState<CompileStatus>({
    status: "empty",
    code: "",
  });
  const onCompileStatusChange = useCallback(
    (compileStatus: CompileStatus) => {
      setCompileStatus(compileStatus);

      if (compileStatus.status === "success") {
        form.setValue("config.tsCode", compileStatus.code);

        // Remove const so that we can eval it as a function
        form.setValue(
          "config.compiledJs",
          compileStatus.compiled
            .slice(compileStatus.compiled.indexOf("async"))
            .replace(/[;\n]+$/, "")
        );
      } else {
        form.setValue("config.tsCode", "");
        form.setValue("config.compiledJs", "");
      }
    },
    [form]
  );

  // Node def validity
  const isNodeDefValid = useMemo(
    () => form.formState.isValid && compileStatus.status === "success",
    [form.formState.isValid, compileStatus]
  );
  // Code editor types
  const getInputTsTypeFromDepsMap = (deps: DepsMap) => {
    return `
      type Input = {
        ${Object.entries(deps)
          .map(([key, value]) => {
            const schemaTs = value
              ? createDataType(value.schema).toTypescript()
              : "unknown";
            return `${key}: ${schemaTs};`;
          })
          .join("\n")}
      }
    `;
  };
  const functionType = `type ValueGetter = (input: Input) => Promise<${createDataType(
    form.watch("returnSchema")
  ).toTypescript()}>;`;

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
            disabled={!isNodeDefValid}
            onClick={(event) => {
              event.preventDefault();

              const { depsMap, ...restOfConfig } = form.getValues("config");
              const depsMapWithoutNulls: Record<string, DataPath> = {};
              Object.entries(depsMap).forEach(([key, value]) => {
                if (!value) return;
                depsMapWithoutNulls[key] = value;
              });

              const computedNodeDef = buildNodeDef(NodeType.Computed, {
                ...form.getValues(),
                eventType: eventType,
                type: NodeType.Computed,
                config: {
                  ...restOfConfig,
                  depsMap: depsMapWithoutNulls,
                },
              });

              if (isEditing && initialNodeId) {
                updateNodeDef({
                  id: initialNodeId,
                  ...computedNodeDef,
                })
                  .then(() => {
                    void router.push(`/settings/event-types/${eventType}/node`);
                  })
                  .catch(handleError);
              } else {
                createNodeDef(computedNodeDef)
                  .then(() => {
                    void router.push(`/settings/event-types/${eventType}/node`);
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
              name="returnSchema"
              render={({ field }) => (
                <FormItem className="w-[16rem] mt-4">
                  <FormLabel>Type</FormLabel>
                  <div>
                    <SchemaBuilder
                      value={field.value as TSchema}
                      onChange={(newSchema) => {
                        field.onChange(newSchema);
                      }}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="config.depsMap"
              render={({ field }) => (
                <FormItem className="w-[16rem] mt-4">
                  <FormLabel>Type</FormLabel>
                  <div>
                    <EditDepsMap
                      eventType={router.query.eventType as string}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      )}

      <Separator className="my-8" />

      <div className="flex mb-4 items-center">
        <div className="text-emphasis-foreground text-md">Code</div>

        <div className="ml-auto" />
        <CompileStatusMessage compileStatus={compileStatus} />
      </div>

      <div className="h-96">
        <CodeEditor
          typeDefs={[
            libSource,
            getInputTsTypeFromDepsMap(form.watch("config.depsMap")),
            functionType,
          ].join("\n\n")}
          initialCode={FUNCTION_TEMPLATE}
          onCompileStatusChange={onCompileStatusChange}
        />
      </div>
    </div>
  );
}

type DepsMap = FormType["config"]["depsMap"];

function EditDepsMap(props: {
  eventType: string;
  value: DepsMap;
  onChange: (value: DepsMap) => void;
}) {
  // Make it look like a javascript object like:
  /**
   * {
   *    field: [select NodeDef]
   *    [+ add field]
   * }
   */

  const { value: depsMapValue, onChange, eventType } = props;

  const { toast } = useToast();
  const { data: nodes } = api.nodeDefs.list.useQuery({ eventType });

  const nodeOptions =
    nodes?.map((node) => ({
      label: node.name,
      value: node.id,
    })) ?? [];
  return (
    <div>
      <div className="flex items-center gap-4 mt-4 mb-2">
        <div className="text-sm font-medium">Dependencies</div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => {
            const newDepsMap = { ...depsMapValue };
            const key = getNewPropertyName(Object.keys(newDepsMap));
            newDepsMap[key] = null;
            onChange(newDepsMap);
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
        {/* <ComboboxSelector
          value={null}
          onSelect={(nodeId) => {
            if (!nodeId) return;

            const newDepsMap = { ...depsMapValue };
            const node = nodes?.find((n) => n.id === nodeId);

            if (!node) return;

            const newKey = stringToPropertyKey(node.name);
            newDepsMap[newKey] = {
              nodeId,
              path: [],
            }

            onChange(newDepsMap);
          }}
          options={nodeOptions}
          renderTrigger={({ value }) => (
            <Button variant="outline" size="xs">
              <Plus className="h-4 w-4" />
            </Button>
          )}
        /> */}
      </div>

      {Object.entries(depsMapValue).map(([key, value]) => {
        return (
          <div className="flex items-center" key={key}>
            <EditableProperty
              value={key}
              currentProperties={Object.keys(depsMapValue)}
              onChange={(newKey) => {
                const newValues = { ...depsMapValue };
                delete newValues[key];
                newValues[newKey] = value;

                onChange(newValues);
              }}
              onInvalid={(message) => {
                toast({
                  title: "Invalid key",
                  description: message,
                });
              }}
            />

            <SelectDataPathOrEntityFeature
              eventType={eventType}
              value={value}
              onChange={(newValue) => {
                if (!newValue) return;

                const newDepsMap = { ...depsMapValue };
                newDepsMap[key] = newValue;
                onChange(newDepsMap);
              }}
            />

            <button
              className="text-red-500 ml-4 text-xs"
              onClick={() => {
                const newValues = { ...depsMapValue };
                delete newValues[key];
                onChange(newValues);
              }}
            >
              delete
            </button>
          </div>
        );
      })}
    </div>
  );
}

function stringToPropertyKey(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toLowerCase()
    .replace(/^_+/g, "_");
}

function getNewPropertyName(existingProperties: string[]): string {
  let i = 0;
  while (true) {
    const newProp = `prop_${i}`;
    if (!existingProperties.includes(newProp)) {
      return newProp;
    }
    i++;
  }
}

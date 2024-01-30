import { zodResolver } from "@hookform/resolvers/zod";
import {
  type TSchema,
  TypeName,
  createDataType,
  tSchemaZod,
  dataPathZodSchema,
  type DataPath,
  FnType,
  buildFnDef,
  getFnTypeDef,
} from "event-processing";
import { Plus, Save } from "lucide-react";
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
import { type CompileStatus } from "../../features/CodeEditor";
import dynamic from "next/dynamic";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import libSource from "!!raw-loader?esModule=false!event-processing/src/function-type-defs/lib/computedNodeLib.ts";
import { EditableProperty } from "../../EditableProperty";
import { useToast } from "../../ui/use-toast";
import { handleError } from "../../../lib/handleError";
import { type NodeEditorProps } from "./types";
import { SelectDataPathOrEntityFeature } from "../SelectDataPathOrEntityFeature";
import { useMutationToasts } from "./useMutationToasts";
import { selectors, useEditorStore } from "./state/zustand";
import { generateNanoId } from "../../../../../packages/common/src";

const DynamicCodeEditor = dynamic(
  () => import("../../features/CodeEditor").then((mod) => mod.CodeEditor),
  {
    ssr: false,
  }
);

const DynamicCompileStatusMessage = dynamic(
  () =>
    import("../../features/CodeEditor").then(
      (mod) => mod.CompileStatusMessage
    ) as any,
  {
    ssr: false,
  }
);

const FUNCTION_TEMPLATE = `const getValue: ValueGetter = async (input) => {\n\n}`;

const fnTypeDef = getFnTypeDef(FnType.Computed);

const formSchema = z.object({
  returnSchema: tSchemaZod,
  name: z.string().min(2, "Name must be at least 2 characters long."),
  config: fnTypeDef.configSchema,
  inputs: fnTypeDef.inputSchema.omit({ depsMap: true }).merge(
    z.object({
      depsMap: z.record(z.string(), dataPathZodSchema.nullable()),
    })
  ),
});

type FormType = z.infer<typeof formSchema>;

export function EditComputed({ initialNodeId, eventType }: NodeEditorProps) {
  const isEditing = !!initialNodeId;

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      returnSchema: {
        type: TypeName.String,
      },
      inputs: {
        depsMap: {},
      },
      config: {
        tsCode: "",
        compiledJs: "",
      },
    },
  });

  const nodes = useEditorStore(selectors.getNodeDefs());
  const initialNode = useEditorStore(
    selectors.getNodeDef(initialNodeId ?? "", FnType.Computed)
  );
  const setNodeDef = useEditorStore.use.setNodeDefWithFn();

  // Initialize form values with initial node
  const [initializedForm, setInitializedForm] = useState(false);
  useEffect(() => {
    if (!initializedForm && initialNode) {
      form.setValue("name", initialNode.name);
      form.setValue("returnSchema", initialNode.fn.returnSchema);
      form.setValue("inputs", initialNode.inputs as FormType["inputs"]);
      form.setValue("config", initialNode.fn.config);
      setInitializedForm(true);
    }
  }, [initialNode, initializedForm, setInitializedForm, form]);

  // Initialize Deps Map with event node
  const [initializedEventDep, setInitializedEventNode] = useState(false);
  useEffect(() => {
    if (!initializedEventDep && nodes && !initialNodeId) {
      const eventNode = nodes.find((n) => n.fn.type === FnType.Event);
      if (eventNode) {
        form.setValue("inputs.depsMap", {
          event: {
            nodeId: eventNode.id,
            path: [],
            schema: eventNode.fn.returnSchema,
          },
        });
        setInitializedEventNode(true);
      }
    }
  }, [
    nodes,
    initializedEventDep,
    setInitializedEventNode,
    form,
    initialNodeId,
  ]);

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

  const toasts = useMutationToasts();

  const depsMap = form.watch("inputs.depsMap");
  const typeDefs = useMemo(() => {
    return [libSource, getInputTsTypeFromDepsMap(depsMap), functionType].join(
      "\n\n"
    );
  }, [depsMap, functionType]);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center">
        <h1 className="text-emphasis-foreground text-2xl mt-1 mb-4">
          {isEditing ? "Edit Node" : "Create Node"}
        </h1>

        <div className="flex gap-2 items-center">
          <Button
            disabled={!isNodeDefValid}
            onClick={(event) => {
              event.preventDefault();

              const { depsMap } = form.getValues("inputs");

              const depsMapWithoutNulls: Record<string, DataPath> = {};
              Object.entries(depsMap).forEach(([key, value]) => {
                if (!value) return;
                depsMapWithoutNulls[key] = value;
              });

              const nodeId = initialNode?.id ?? generateNanoId();
              const fnId = initialNode?.fn.id ?? generateNanoId();

              setNodeDef(FnType.Computed, {
                id: nodeId,
                name: form.getValues("name"),
                eventType,
                fn: {
                  id: fnId,
                  name: "computed",
                  type: FnType.Computed,
                  config: form.getValues("config"),
                  returnSchema: form.getValues("returnSchema"),
                },
                inputs: {
                  depsMap: depsMapWithoutNulls,
                },
              })
                .then(toasts.createNode.onSuccess)
                .catch(toasts.createNode.onError)
                // .then(() => {
                //   void router.push(`/settings/event-types/${eventType}`);
                // })
                .catch(handleError);
            }}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

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
            name="inputs.depsMap"
            render={({ field }) => (
              <FormItem className="w-[16rem] mt-4">
                <div>
                  <EditDepsMap
                    eventType={eventType}
                    value={field.value}
                    onChange={(depsMap) => {
                      field.onChange(depsMap);

                      // const depsSchema = Object.entries(depsMap).reduce(
                      //   (acc, [key, value]) => {
                      //     if (!value) return acc;
                      //     acc[key] = value.schema;
                      //     return acc;
                      //   },
                      //   {} as Record<string, TSchema>
                      // );
                      // form.setValue("config.depsSchema", depsSchema);
                    }}
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>

      <Separator className="my-8" />

      <div className="flex mb-4 items-center">
        <div className="text-emphasis-foreground text-md">Code</div>

        <div className="ml-auto" />
        <DynamicCompileStatusMessage compileStatus={compileStatus} />
      </div>

      <div className="h-96">
        <DynamicCodeEditor
          typeDefs={typeDefs}
          initialCode={
            isEditing ? form.getValues("config.tsCode") : FUNCTION_TEMPLATE
          }
          onCompileStatusChange={onCompileStatusChange}
        />
      </div>
    </div>
  );
}

type DepsMap = FormType["inputs"]["depsMap"];

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
              disablePathSelection={true}
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

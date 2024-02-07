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
import dynamic from "next/dynamic";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { EditableProperty } from "../../EditableProperty";
import { useToast } from "../../ui/use-toast";
import { handleError } from "../../../lib/handleError";
import { type NodeEditorProps } from "./types";
import { SelectDataPathOrEntityFeature } from "../SelectDataPathOrEntityFeature";
import { useMutationToasts } from "./useMutationToasts";
import { selectors, useEditorStore } from "./state/zustand";
import { generateNanoId } from "../../../../../packages/common/src";
import { useAtom } from "jotai";
import {
  FUNCTION_TEMPLATE,
  compileStatusAtom,
  tsCodeAtom,
} from "../code-editor/state";
import { getTypeDefs } from "event-processing/src/function-type-defs/types/Computed";
import { CodeEditor, CompileStatusMessage } from "../code-editor/CodeEditor";
import { MonacoEditor } from "../../ts-editor/MonacoEditor";

const fnTypeDef = getFnTypeDef(FnType.Computed);

const formSchema = z.object({
  returnSchema: tSchemaZod,
  inferredSchema: tSchemaZod.nullable(),
  name: z.string().min(2, "Name must be at least 2 characters long."),
  config: fnTypeDef.configSchema,
  inputs: fnTypeDef.inputSchema.omit({ depsMap: true }).merge(
    z.object({
      depsMap: z.record(z.string(), dataPathZodSchema.nullable()),
    })
  ),
});

type FormType = z.infer<typeof formSchema>;

export function EditComputed({
  initialNodeId,
  eventType,
  onSaveSuccess,
}: NodeEditorProps) {
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
      inferredSchema: null,
      config: {
        tsCode: "",
        compiledJs: "",
      },
    },
  });

  const nodes = useEditorStore(selectors.getNodeDefs());
  const getDataPathInfo = useEditorStore.use.getDataPathInfo();
  const initialNode = useEditorStore(
    selectors.getNodeDef(initialNodeId ?? "", FnType.Computed)
  );
  const setNodeDef = useEditorStore.use.setNodeDefWithFn();

  // Initialize form values with initial node
  const [initializedForm, setInitializedForm] = useState(false);
  const [code, setCode] = useAtom(tsCodeAtom);
  useEffect(() => {
    if (!initializedForm) {
      if (initialNode) {
        form.reset({
          name: initialNode.name,
          returnSchema: initialNode.fn.returnSchema,
          inputs: {
            depsMap: initialNode.inputs.depsMap,
          },
          config: initialNode.fn.config,
        });
        setCode(initialNode.fn.config.tsCode);
      } else {
        setCode(FUNCTION_TEMPLATE);
      }
      setInitializedForm(true);
    }
  }, [initialNode, initializedForm, setInitializedForm, form, setCode]);

  // Initialize Deps Map with event node
  const [initializedEventDep, setInitializedEventNode] = useState(false);
  useEffect(() => {
    if (!initializedEventDep && nodes && !initialNodeId) {
      const eventNode = nodes.find(
        (n) => n.fn.type === FnType.Event && n.eventType === eventType
      );
      if (eventNode) {
        form.setValue("inputs.depsMap", {
          event: {
            nodeId: eventNode.id,
            path: [],
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
    eventType,
  ]);

  // Code validity
  const [compileStatus, setCompileStatus] = useAtom(compileStatusAtom);

  useEffect(() => {
    if (compileStatus.status === "success") {
      form.setValue("config.tsCode", compileStatus.code);

      // Remove const so that we can eval it as a function
      // from:  const getValue = async ...
      // to:    async ...
      form.setValue(
        "config.compiledJs",
        compileStatus.compiled
          .slice(compileStatus.compiled.indexOf("async"))
          .replace(/[;\n]+$/, "")
      );

      form.setValue("inferredSchema", compileStatus.inferredSchema);
    } else {
      form.setValue("config.tsCode", "");
      form.setValue("config.compiledJs", "");
      if (compileStatus.status === "error") {
        form.setValue("inferredSchema", compileStatus.inferredSchema);
      }
    }
  }, [compileStatus, form]);

  // Node def validity
  const isNodeDefValid = useMemo(
    () => form.formState.isValid && compileStatus.status === "success",
    [form.formState.isValid, compileStatus]
  );

  const toasts = useMutationToasts();

  const depsMap = form.watch("inputs.depsMap");
  const returnSchema = form.watch("returnSchema");
  const typeDefs = useMemo(() => {
    return getTypeDefs({
      deps: depsMap,
      returnSchema: returnSchema,
      getDataPathInfo,
    });
  }, [depsMap, getDataPathInfo, returnSchema]);

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
                .then((res) => {
                  onSaveSuccess();
                  return res;
                })
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
              <FormItem className="mt-4">
                <FormLabel>Type</FormLabel>
                <div>
                  <SchemaBuilder
                    value={field.value as TSchema}
                    onChange={field.onChange}
                  />
                  {form.watch("inferredSchema") && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        const inferredSchema = form.watch("inferredSchema");
                        if (!inferredSchema) return;
                        field.onChange(inferredSchema);
                      }}
                    >
                      infer
                    </button>
                  )}
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
                    // Don't know why but field.value doesn't work here
                    value={form.watch("inputs.depsMap")}
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
        <CompileStatusMessage compileStatus={compileStatus} />
      </div>

      <div className="h-96">
        <CodeEditor typeDefs={typeDefs} />
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

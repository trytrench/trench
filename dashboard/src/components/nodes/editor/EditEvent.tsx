import { zodResolver } from "@hookform/resolvers/zod";
import { TypeName, FnType, getFnTypeDef, tSchemaZod } from "event-processing";
import { Save } from "lucide-react";
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

import { useToast } from "../../ui/use-toast";
import { handleError } from "../../../lib/handleError";
import { type NodeEditorProps } from "./types";
import { useMutationToasts } from "./useMutationToasts";
import { selectors, useEditorStore } from "./state/zustand";
import { SchemaBuilder } from "../../SchemaBuilder";

const fnTypeDef = getFnTypeDef(FnType.Event);
const formSchema = z.object({
  returnSchema: tSchemaZod,
});

type FormType = z.infer<typeof formSchema>;

export function EditEvent({ initialNodeId, onSaveSuccess }: NodeEditorProps) {
  const isEditing = !!initialNodeId;

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      returnSchema: {
        type: TypeName.Any,
      },
    },
  });

  const { toast } = useToast();

  const initialNode = useEditorStore(
    selectors.getNodeDef(initialNodeId ?? "", FnType.Event)
  );

  // Initialize form values with initial node
  const [initializedForm, setInitializedForm] = useState(false);
  useEffect(() => {
    if (!initializedForm && initialNode) {
      form.setValue("returnSchema", initialNode.fn.returnSchema);
      setInitializedForm(true);
    }
  }, [initialNode, initializedForm, setInitializedForm, form]);

  const toasts = useMutationToasts();
  const setFnDef = useEditorStore.use.setFnDef();

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-emphasis-foreground text-2xl mt-1 mb-4">
          {isEditing ? "Edit Node" : "Create Node"}
        </h1>

        <div className="flex gap-2 items-center">
          <Button
            onClick={(event) => {
              event.preventDefault();

              if (!initialNode) {
                toast({
                  title: "Must be editing an existing node",
                });
                return;
              }

              setFnDef({
                ...initialNode.fn,
                returnSchema: form.getValues("returnSchema"),
              })
                .then((res) => {
                  onSaveSuccess();
                  return res;
                })
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
            name="returnSchema"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <div>
                    <SchemaBuilder
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}

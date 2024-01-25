import { zodResolver } from "@hookform/resolvers/zod";
import { TypeName, type NodeDef } from "event-processing";
import { Pencil, Save } from "lucide-react";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import CountSelector, { type UniqueCountConfig } from "./CountSelector";
import FeatureAssignSelector from "./FeatureAssignSelector";
import { type FeatureDep } from "./NodeDepSelector";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
});

interface Props {
  initialNodeDef?: NodeDef;
  onRename: (name: string) => void;
  onSave: (
    name: string,
    assignToFeatures: FeatureDep[],
    countUniqueConfig: UniqueCountConfig
  ) => void;
}

export function EditUniqueCount({ initialNodeDef, onSave, onRename }: Props) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const router = useRouter();

  const [countUniqueConfig, setCountUniqueConfig] = useState<UniqueCountConfig>(
    {
      countUniqueFeatureDeps: [],
      countByFeatureDeps: [],
      countUniqueNodeDeps: [],
      countByNodeDeps: [],
      conditionFeatureDep: null,
      conditionNodeDep: null,
      timeWindow: null,
    }
  );

  const isValid = useMemo(
    () => form.formState.isValid,
    [form.formState.isValid]
  );

  const isEditing = useMemo(() => !!initialNodeDef, [initialNodeDef]);

  const [assignToFeatures, setAssignToFeatures] = useState<FeatureDep[]>([]);

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

              onSave(
                form.getValues("name"),
                assignToFeatures,
                countUniqueConfig
              );
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

          <div className="text-sm font-medium mt-4 mb-2">Assign</div>

          <div className="flex items-center space-x-2 mt-2">
            <FeatureAssignSelector
              features={assignToFeatures}
              onFeaturesChange={setAssignToFeatures}
            />
          </div>

          <div className="text-sm font-medium mt-4 mb-2">Count Unique</div>

          <div className="flex items-center space-x-2 mt-2">
            <CountSelector
              config={countUniqueConfig}
              onConfigChange={setCountUniqueConfig}
              eventType={router.query.eventType as string}
            />
          </div>
        </>
      )}
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

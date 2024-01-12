import { zodResolver } from "@hookform/resolvers/zod";
import {
  NodeDefsMap,
  NodeType,
  TypeName,
  type NodeDef,
} from "event-processing";
import { Pencil, Plus, Save, X } from "lucide-react";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import NodeCombobox from "~/components/NodeCombobox";
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
import { api } from "~/utils/api";
import AssignEntities from "../../AssignEntities";
import { FeatureDep, NodeDep, NodeDepSelector } from "./NodeDepSelector";
import { TimeWindow, TimeWindowDialog } from "./TimeWindowDialog";

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
  onSave: (
    def: Partial<NodeDefsMap[NodeType.UniqueCounter]>,
    assignedToFeatures: FeatureDep[]
  ) => void;
}

export function EditCount({ initialNodeDef, onSave, onRename }: Props) {
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

  const { data: features } = api.features.list.useQuery();
  const { data: nodes } = api.nodeDefs.list.useQuery({
    eventTypeId: router.query.eventTypeId as string,
  });

  const [config, setConfig] = useState(
    initialNodeDef?.config ?? {
      code: "",
      depsMap: {},
    }
  );

  const [countUniqueFeatureDeps, setCountUniqueFeatureDeps] = useState<
    FeatureDep[]
  >([]);
  const [countUniqueNodeDeps, setCountUniqueNodeDeps] = useState<NodeDef[]>([]);

  const [countByFeatureDeps, setCountByFeatureDeps] = useState<FeatureDep[]>(
    []
  );
  const [countByNodeDeps, setCountByNodeDeps] = useState<NodeDef[]>([]);

  const [conditionNode, setConditionNode] = useState<
    FeatureDep | NodeDef | null
  >(null);

  const isValid = useMemo(
    () => form.formState.isValid,
    [form.formState.isValid]
  );

  const isEditing = useMemo(() => !!initialNodeDef, [initialNodeDef]);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const [assignedToFeatures, setAssignedToFeatures] = useState<FeatureDep[]>(
    []
  );

  const [timeWindow, setTimeWindow] = useState<TimeWindow | null>(null);

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
                {
                  // ...initialNodeDef,

                  name: form.getValues("name"),
                  config: {
                    timeWindowMs: 1000 * 60 * 60,
                    countByNodeIds: countByNodeDeps.map((dep) => dep.id),
                    countUniqueNodeIds: countUniqueNodeDeps.map(
                      (dep) => dep.id
                    ),
                  } as Partial<NodeDefsMap[NodeType.UniqueCounter]["config"]>,
                },
                assignedToFeatures
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
            {assignedToFeatures.map((featureDep) => (
              <FeatureDep
                key={featureDep.feature.id + featureDep.node.id}
                nodeName={featureDep.node.name}
                featureName={featureDep.feature.name}
                onDelete={() => {
                  setAssignedToFeatures(
                    assignedToFeatures.filter(
                      (dep) =>
                        dep.node.id !== featureDep.node.id ||
                        dep.feature.id !== featureDep.feature.id
                    )
                  );
                }}
              />
            ))}

            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
              <DialogTrigger>
                <Button variant="outline" size="xs">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <AssignEntities
                  onAssign={(node, feature) => {
                    setAssignedToFeatures([
                      ...assignedToFeatures,
                      { node, feature },
                    ]);
                    setAssignDialogOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="text-sm font-medium mt-4 mb-2">Count Unique</div>

          <div className="flex items-center space-x-2 mt-2">
            <NodeDepSelector
              nodes={nodes ?? []}
              features={features ?? []}
              nodeDeps={countUniqueNodeDeps}
              featureDeps={countUniqueFeatureDeps}
              onFeatureDepsChange={setCountUniqueFeatureDeps}
              onNodeDepsChange={setCountUniqueNodeDeps}
            />

            <div className="text-sm">By</div>
            <NodeDepSelector
              nodes={nodes ?? []}
              features={features ?? []}
              nodeDeps={countByNodeDeps}
              featureDeps={countByFeatureDeps}
              onFeatureDepsChange={setCountByFeatureDeps}
              onNodeDepsChange={setCountByNodeDeps}
            />
            <div className="text-sm">Where</div>

            {!conditionNode ? (
              <NodeCombobox
                nodes={
                  nodes?.filter(
                    (node) =>
                      node.returnSchema.type === TypeName.Boolean ||
                      node.type === NodeType.EntityAppearance
                  ) ?? []
                }
                features={
                  features?.filter(
                    (feature) => feature.schema.type === TypeName.Boolean
                  ) ?? []
                }
                onSelectFeature={(node, feature) =>
                  setConditionNode({ node, feature })
                }
                onSelectNode={setConditionNode}
                selectedFeatureIds={[]}
                selectedNodeIds={[]}
              >
                <Button variant="outline" size="xs">
                  <Plus className="h-4 w-4" />
                </Button>
              </NodeCombobox>
            ) : "feature" in conditionNode ? (
              <FeatureDep
                nodeName={conditionNode.node.name}
                featureName={conditionNode.feature.name}
                onDelete={() => setConditionNode(conditionNode)}
              />
            ) : (
              <NodeDep
                nodeName={conditionNode.name}
                onDelete={() => setConditionNode(null)}
              />
            )}

            <div className="text-sm">In the last</div>

            {timeWindow ? (
              <div className="flex items-center space-x-2 rounded-md border px-2 py-1">
                <div className="text-sm">{timeWindow.value}</div>
                <div className="text-sm">{timeWindow.unit}</div>
                <X className="h-4 w-4" onClick={() => setTimeWindow(null)} />
              </div>
            ) : (
              <TimeWindowDialog onSubmit={setTimeWindow}>
                <Button variant="outline" size="xs">
                  <Plus className="h-4 w-4" />
                </Button>
              </TimeWindowDialog>
            )}
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

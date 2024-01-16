import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import AssignEntities from "../../AssignEntities";
import { FeatureDep, NodeDep } from "./NodeDepSelector";

interface Props {
  features: FeatureDep[];
  onFeaturesChange: (features: FeatureDep[]) => void;
  onAssignToEvent: (assign: boolean) => void;
  assignedToEvent: boolean;
}

export default function FeatureAssignSelector({
  features,
  onFeaturesChange,
  onAssignToEvent,
  assignedToEvent,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {assignedToEvent && (
        <NodeDep nodeName="Event" onDelete={() => onAssignToEvent(false)} />
      )}

      {features.map((featureDep) => (
        <FeatureDep
          key={featureDep.feature.id + featureDep.node.id}
          nodeName={featureDep.node.name}
          featureName={featureDep.feature.name}
          onDelete={() => {
            onFeaturesChange(
              features.filter(
                (dep) =>
                  dep.node.id !== featureDep.node.id ||
                  dep.feature.id !== featureDep.feature.id
              )
            );
          }}
        />
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="xs">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <AssignEntities
            onAssign={(node, feature) => {
              onFeaturesChange([...features, { node, feature }]);
              setOpen(false);
            }}
            onAssignToEvent={() => {
              onAssignToEvent(true);
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

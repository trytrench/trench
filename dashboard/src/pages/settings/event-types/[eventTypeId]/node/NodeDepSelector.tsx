import type { FeatureDef, NodeDef } from "event-processing";
import { Plus, X } from "lucide-react";
import NodeCombobox from "~/components/NodeCombobox";
import { Button } from "~/components/ui/button";

export type FeatureDep = {
  feature: FeatureDef;
  node: NodeDef;
};

interface NodeDepProps {
  nodeName: string;
  onDelete: () => void;
}

export const NodeDep = ({ nodeName, onDelete }: NodeDepProps) => {
  return (
    <div className="flex items-center space-x-2 rounded-md border px-2 py-1">
      <div className="text-sm">{nodeName}</div>
      <X className="h-4 w-4" onClick={onDelete} />
    </div>
  );
};

interface FeatureDepProps {
  nodeName: string;
  featureName: string;
  onDelete: () => void;
}

export const FeatureDep = ({
  nodeName,
  featureName,
  onDelete,
}: FeatureDepProps) => {
  return (
    <div className="flex items-center space-x-2 rounded-md border px-2 py-1">
      <div className="text-sm">{nodeName}</div>
      <div className="text-sm">{featureName}</div>
      <X className="h-4 w-4" onClick={onDelete} />
    </div>
  );
};

interface NodeDepSelectorProps {
  featureDeps: FeatureDep[];
  nodeDeps: NodeDef[];
  onFeatureDepsChange: (deps: FeatureDep[]) => void;
  onNodeDepsChange: (deps: NodeDef[]) => void;
  eventTypeId: string;
}

export function NodeDepSelector({
  featureDeps,
  nodeDeps,
  onFeatureDepsChange,
  onNodeDepsChange,
  eventTypeId,
}: NodeDepSelectorProps) {
  return (
    <>
      {featureDeps.map((featureDep) => (
        <FeatureDep
          key={featureDep.feature.id + featureDep.node.id}
          nodeName={featureDep.node.name}
          featureName={featureDep.feature.name}
          onDelete={() => {
            onFeatureDepsChange(
              featureDeps.filter(
                (dep) =>
                  dep.node.id !== featureDep.node.id ||
                  dep.feature.id !== featureDep.feature.id
              )
            );
          }}
        />
      ))}
      {nodeDeps.map((nodeDep) => (
        <NodeDep
          key={nodeDep.id}
          nodeName={nodeDep.name}
          onDelete={() =>
            onNodeDepsChange(nodeDeps.filter((dep) => dep.id !== nodeDep.id))
          }
        />
      ))}
      <NodeCombobox
        eventTypeId={eventTypeId}
        onSelectFeature={(node, feature) => {
          onFeatureDepsChange([...featureDeps, { feature, node }]);
        }}
        onSelectNode={(node) => {
          onNodeDepsChange([...nodeDeps, node]);
        }}
        selectedFeatureIds={featureDeps.map((dep) => dep.feature.id)}
        selectedNodeIds={nodeDeps.map((dep) => dep.id)}
      >
        <Button variant="outline" size="xs">
          <Plus className="h-4 w-4" />
        </Button>
      </NodeCombobox>
    </>
  );
}

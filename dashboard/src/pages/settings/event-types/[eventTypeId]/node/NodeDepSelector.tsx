import { Plus, X } from "lucide-react";
import NodeCombobox from "~/components/NodeCombobox";
import { Button } from "~/components/ui/button";

export type FeatureDep = {
  featureId: string;
  featureName: string;
  nodeId: string;
  nodeName: string;
};

export type NodeDep = {
  nodeId: string;
  nodeName: string;
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
  nodeDeps: NodeDep[];
  onFeatureDepsChange: (deps: FeatureDep[]) => void;
  onNodeDepsChange: (deps: NodeDep[]) => void;
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
          key={featureDep.featureId + featureDep.nodeId}
          nodeName={featureDep.nodeName}
          featureName={featureDep.featureName}
          onDelete={() => {
            onFeatureDepsChange(
              featureDeps.filter(
                (dep) =>
                  dep.nodeId !== featureDep.nodeId ||
                  dep.featureId !== featureDep.featureId
              )
            );
          }}
        />
      ))}
      {nodeDeps.map((nodeDep) => (
        <NodeDep
          key={nodeDep.nodeId}
          nodeName={nodeDep.nodeName}
          onDelete={() =>
            onNodeDepsChange(
              nodeDeps.filter((dep) => dep.nodeId !== nodeDep.nodeId)
            )
          }
        />
      ))}
      <NodeCombobox
        eventTypeId={eventTypeId}
        onSelectFeature={(node, feature) => {
          onFeatureDepsChange([
            ...featureDeps,
            {
              featureId: feature.id,
              featureName: feature.name,
              nodeId: node.id,
              nodeName: node.name,
            },
          ]);
        }}
        onSelectNode={(node) => {
          onNodeDepsChange([
            ...nodeDeps,
            {
              nodeId: node.id,
              nodeName: node.name,
            },
          ]);
        }}
        selectedFeatureIds={featureDeps.map((dep) => dep.featureId)}
        selectedNodeIds={nodeDeps.map((dep) => dep.nodeId)}
      >
        <Button variant="outline" size="xs">
          <Plus className="h-4 w-4" />
        </Button>
      </NodeCombobox>
    </>
  );
}

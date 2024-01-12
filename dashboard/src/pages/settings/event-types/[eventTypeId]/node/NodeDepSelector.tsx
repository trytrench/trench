import type {
  FeatureDef,
  NodeDef,
  NodeDefsMap,
  NodeType,
} from "event-processing";
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
  nodes: NodeDef[];
  features: FeatureDef[];
  canSelectEntityNode?: boolean;
}

export function NodeDepSelector({
  featureDeps,
  nodeDeps,
  onFeatureDepsChange,
  onNodeDepsChange,
  nodes,
  features,
  canSelectEntityNode,
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
      {nodeDeps.map((nodeDep, index) => (
        <div
          key={nodeDep.id}
          className="flex items-center space-x-2 rounded-md border px-2 py-1"
        >
          <NodeCombobox
            nodes={nodes}
            features={features}
            onSelectFeature={(node, feature) => {
              onNodeDepsChange(nodeDeps.filter((dep, i) => i !== index));
              onFeatureDepsChange([...featureDeps, { feature, node }]);
            }}
            onSelectNode={(node) => {
              onNodeDepsChange([...nodeDeps, node]);
            }}
            selectedFeatureIds={featureDeps.map((dep) => dep.feature.id)}
            selectedNodeIds={nodeDeps.map((dep) => dep.id)}
            onSelectEntityNode={
              canSelectEntityNode
                ? (node) => onNodeDepsChange([...nodeDeps, node])
                : undefined
            }
            entityNode={nodeDep as NodeDefsMap[NodeType.EntityAppearance]}
          >
            <div className="text-sm">{nodeDep.name}</div>
          </NodeCombobox>
          <X
            className="h-4 w-4"
            onClick={() =>
              onNodeDepsChange(nodeDeps.filter((dep) => dep.id !== nodeDep.id))
            }
          />
        </div>
      ))}
      <NodeCombobox
        nodes={nodes}
        features={features}
        onSelectFeature={(node, feature) => {
          onFeatureDepsChange([...featureDeps, { feature, node }]);
        }}
        onSelectNode={(node) => {
          onNodeDepsChange([...nodeDeps, node]);
        }}
        selectedFeatureIds={featureDeps.map((dep) => dep.feature.id)}
        selectedNodeIds={nodeDeps.map((dep) => dep.id)}
        onSelectEntityNode={
          canSelectEntityNode
            ? (node) => onNodeDepsChange([...nodeDeps, node])
            : undefined
        }
      >
        <Button variant="outline" size="xs">
          <Plus className="h-4 w-4" />
        </Button>
      </NodeCombobox>
    </>
  );
}

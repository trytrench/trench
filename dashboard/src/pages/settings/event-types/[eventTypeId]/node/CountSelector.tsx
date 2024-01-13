import { NodeType, TypeName, type NodeDef } from "event-processing";
import { Plus, X } from "lucide-react";
import NodeCombobox from "~/components/NodeCombobox";
import { Button } from "~/components/ui/button";
import { api } from "~/utils/api";
import { FeatureDep, NodeDep, NodeDepSelector } from "./NodeDepSelector";
import { type TimeWindow, TimeWindowDialog } from "./TimeWindowDialog";

export type CountConfig = {
  countByFeatureDeps: FeatureDep[];
  countByNodeDeps: NodeDef[];
  conditionFeatureDep: FeatureDep | null;
  conditionNodeDep: NodeDef | null;
  timeWindow: TimeWindow | null;
};

export type UniqueCount = {
  countUniqueFeatureDeps: FeatureDep[];
  countByFeatureDeps: FeatureDep[];
  countUniqueNodeDeps: NodeDef[];
  countByNodeDeps: NodeDef[];
  conditionFeatureDep: FeatureDep | null;
  conditionNodeDep: NodeDef | null;
  timeWindow: TimeWindow | null;
};

interface Props {
  eventTypeId: string;
  config: CountConfig | UniqueCount;
  onConfigChange: (config: CountConfig | UniqueCount) => void;
}

export default function CountSelector({
  config,
  onConfigChange,
  eventTypeId,
}: Props) {
  const { data: features } = api.features.list.useQuery();
  const { data: nodes } = api.nodeDefs.list.useQuery({ eventTypeId });

  const {
    countUniqueFeatureDeps,
    countUniqueNodeDeps,
    countByFeatureDeps,
    countByNodeDeps,
    conditionFeatureDep,
    conditionNodeDep,
    timeWindow,
  } = config;

  return (
    <>
      {countUniqueFeatureDeps && (
        <NodeDepSelector
          nodes={nodes ?? []}
          features={features ?? []}
          nodeDeps={countUniqueNodeDeps}
          featureDeps={countUniqueFeatureDeps}
          onFeatureDepsChange={(deps) =>
            onConfigChange({ ...config, countUniqueFeatureDeps: deps })
          }
          onNodeDepsChange={(deps) =>
            onConfigChange({ ...config, countUniqueNodeDeps: deps })
          }
          canSelectEntityNode
        />
      )}

      <div className="text-sm">By</div>
      <NodeDepSelector
        nodes={nodes ?? []}
        features={features ?? []}
        nodeDeps={countByNodeDeps}
        featureDeps={countByFeatureDeps}
        onFeatureDepsChange={(deps) =>
          onConfigChange({ ...config, countByFeatureDeps: deps })
        }
        onNodeDepsChange={(deps) =>
          onConfigChange({ ...config, countByNodeDeps: deps })
        }
        canSelectEntityNode
      />
      <div className="text-sm">Where</div>

      {conditionNodeDep ? (
        <NodeDep
          nodeName={conditionNodeDep.name}
          onDelete={() => onConfigChange({ ...config, conditionNodeDep: null })}
        />
      ) : conditionFeatureDep ? (
        <FeatureDep
          nodeName={conditionFeatureDep.node.name}
          featureName={conditionFeatureDep.feature.name}
          onDelete={() =>
            onConfigChange({ ...config, conditionFeatureDep: null })
          }
        />
      ) : (
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
            onConfigChange({
              ...config,
              conditionFeatureDep: { node, feature },
            })
          }
          onSelectNode={(node) =>
            onConfigChange({ ...config, conditionNodeDep: node })
          }
          selectedFeatureIds={[]}
          selectedNodeIds={[]}
        >
          <Button variant="outline" size="xs">
            <Plus className="h-4 w-4" />
          </Button>
        </NodeCombobox>
      )}

      <div className="text-sm">In the last</div>

      {timeWindow ? (
        <div className="flex items-center space-x-2 rounded-md border px-2 py-1">
          <div className="text-sm">{timeWindow.value}</div>
          <div className="text-sm">{timeWindow.unit}</div>
          <X
            className="h-4 w-4"
            onClick={() => onConfigChange({ ...config, timeWindow: null })}
          />
        </div>
      ) : (
        <TimeWindowDialog
          onSubmit={(timeWindow) => onConfigChange({ ...config, timeWindow })}
        >
          <Button variant="outline" size="xs">
            <Plus className="h-4 w-4" />
          </Button>
        </TimeWindowDialog>
      )}
    </>
  );
}

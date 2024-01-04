import { GlobalStateKey, prisma } from "databases";
import { DataType } from "./dataTypes";
import { ExecutionEngine } from "./engine";
import { FeatureDef } from "./feature-type-defs/nodeTypeDef";
import { FeatureType } from "./feature-type-defs/types/_enum";

export function getFeatureDefFromSnapshot({
  featureDefSnapshot,
}: {
  featureDefSnapshot: {
    id: string;
    config: any;
    deps: string[];
    eventTypes: string[];
    node: {
      id: string;
      type: string;
      dataType: string;
      name: string;
    };
  };
}): FeatureDef {
  return {
    featureId: featureDefSnapshot.node.id,
    featureType: featureDefSnapshot.node.type as FeatureType,
    featureName: featureDefSnapshot.node.name,
    dependsOn: new Set(featureDefSnapshot.deps),
    eventTypes: new Set(featureDefSnapshot.eventTypes),
    config: featureDefSnapshot.config as object,
    dataType: featureDefSnapshot.node.dataType as DataType,
  };
}

async function fetchFeatureDefSnapshots({
  engineId,
}: {
  engineId: string;
}): Promise<FeatureDef[]> {
  // Check for new engine
  const engineDef = await prisma.executionEngine.findUnique({
    where: { id: engineId },
    include: {
      nodeSnapshots: {
        include: {
          nodeSnapshot: {
            include: {
              node: true,
            },
          },
        },
      },
    },
  });

  if (!engineDef) {
    throw new Error(`No engine found for engineId ${engineId}`);
  }
  const featureDefs = engineDef.nodeSnapshots.map((item) => {
    const snapshot = item.nodeSnapshot;
    return getFeatureDefFromSnapshot({ featureDefSnapshot: snapshot });
  });

  return featureDefs;
}

export async function fetchCurrentEngineId() {
  const state = await prisma.globalState.findUnique({
    where: { key: GlobalStateKey.ActiveEngineId },
  });
  return state?.value ?? null;
}

export async function createEngine({ engineId }: { engineId: string }) {
  const nodeDefs = await fetchFeatureDefSnapshots({ engineId });
  return new ExecutionEngine({ nodeDefs, engineId });
}

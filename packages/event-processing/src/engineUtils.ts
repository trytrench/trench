import { GlobalStateKey, prisma } from "databases";
import { DataType } from "./dataTypes";
import { ExecutionEngine } from "./engine";
import { FeatureDef } from "./feature-type-defs/featureTypeDef";
import { FeatureType } from "./feature-type-defs/types/_enum";

export function getFeatureDefFromSnapshot({
  featureDefSnapshot,
}: {
  featureDefSnapshot: {
    id: string;
    config: any;
    deps: string[];
    featureDef: {
      id: string;
      type: string;
      dataType: string;
    };
  };
}): FeatureDef {
  return {
    featureId: featureDefSnapshot.featureDef.id,
    featureType: featureDefSnapshot.featureDef.type as FeatureType,
    dependsOn: new Set(featureDefSnapshot.deps),
    config: featureDefSnapshot.config as object,
    dataType: featureDefSnapshot.featureDef.dataType as DataType,
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
      featureDefSnapshots: {
        include: {
          featureDefSnapshot: {
            include: {
              featureDef: true,
            },
          },
        },
      },
    },
  });

  if (!engineDef) {
    throw new Error(`No engine found for engineId ${engineId}`);
  }
  const featureDefs = engineDef.featureDefSnapshots.map((item) => {
    const snapshot = item.featureDefSnapshot;
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
  const featureDefs = await fetchFeatureDefSnapshots({ engineId });
  return new ExecutionEngine({ featureDefs, engineId });
}

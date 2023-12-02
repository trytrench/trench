import { GlobalStateKey, prisma } from "databases";
import { ExecutionEngine } from "./engine";
import { FeatureDef, FeatureType } from "./features/featureTypes";
import { DataType } from "./features/dataTypes";

async function fetchFeatureDefs({
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
    return {
      id: snapshot.featureDef.id,
      deps: snapshot.deps,
      config: snapshot.config as object,
      dataType: snapshot.featureDef.dataType as DataType,
      type: snapshot.featureDef.type as FeatureType,
    };
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
  const featureDefs = await fetchFeatureDefs({ engineId });
  return new ExecutionEngine({ featureDefs, engineId });
}

import { GlobalStateKey, prisma } from "databases";
import { DataType } from "./dataTypes";
import { ExecutionEngine } from "./engine";
import { FeatureDef } from "./feature-type-defs/featureTypeDef";
import { FeatureType } from "./feature-type-defs/types/_enum";

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
      featureId: snapshot.featureDef.id,
      featureType: snapshot.featureDef.type as FeatureType,
      dependsOn: new Set(snapshot.deps),
      config: snapshot.config as object,
      dataType: snapshot.featureDef.dataType as DataType,
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

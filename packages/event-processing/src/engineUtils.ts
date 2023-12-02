import { GlobalStateKey, prisma } from "databases";
import { ExecutionEngine } from "./engine";
import { FeatureFactory } from "./features/feature-types/FeatureFactory";
import { ComputedFeature } from "./features/feature-types/types/Computed";
import { CountFeature } from "./features/feature-types/types/Count";
import { UniqueCountFeature } from "./features/feature-types/types/UniqueCount";
import { FeatureDef, FeatureType } from "./features/featureTypes";
import { MockRedisService } from "./features/services/redis";
import { assert } from "./utils";

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
          featureDefSnapshot: true,
        },
      },
    },
  });

  return [];
}

export async function fetchCurrentEngineId() {
  const state = await prisma.globalState.findUnique({
    where: { key: GlobalStateKey.ActiveEngineId },
  });
  return state?.value;
}

export async function createEngine({ engineId }: { engineId: string }) {
  const featureDefs = await fetchFeatureDefs({ engineId });
  return new ExecutionEngine({ featureDefs, engineId });
}

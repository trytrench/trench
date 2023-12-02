import { GlobalStateKey, prisma } from "databases";
import { ExecutionEngine } from "./engine";
import { FeatureFactory } from "./features/feature-types/FeatureFactory";
import { ComputedFeature } from "./features/feature-types/types/Computed";
import { CountFeature } from "./features/feature-types/types/Count";
import { UniqueCountFeature } from "./features/feature-types/types/UniqueCount";
import { FeatureDef, FeatureType } from "./features/featureTypes";
import { MockRedisService } from "./features/services/redis";
import { assert } from "./utils";

const redis = new MockRedisService();

const factories: Record<FeatureType, FeatureFactory<any>> = {
  [FeatureType.Count]: new CountFeature(redis),
  [FeatureType.UniqueCount]: new UniqueCountFeature(redis),
  [FeatureType.Computed]: new ComputedFeature(),
};

function createEngineFromDefs({
  featureDefs,
  engineId,
}: {
  featureDefs: FeatureDef[];
  engineId: string;
}) {
  const featureInstances = featureDefs.map((featureDef) => {
    const factory = factories[featureDef.type];
    assert(factory, `Unknown feature type ${featureDef.type}`);
    return factory.createFeatureInstance({
      config: featureDef.config,
      dataType: featureDef.dataType,
      featureId: featureDef.id,
      dependsOn: new Set(featureDef.deps),
    });
  });

  const engine = new ExecutionEngine({ featureInstances, engineId });

  return engine;
}

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
  return createEngineFromDefs({ featureDefs, engineId });
}

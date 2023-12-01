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

export function createEngine({ featureDefs }: { featureDefs: FeatureDef[] }) {
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

  const engine = new ExecutionEngine({ featureInstances, engineId: "test" });

  return engine;
}

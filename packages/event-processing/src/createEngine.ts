import { FeatureType } from "./features/factories/FeatureType";
import { ComputedFeature } from "./features/factories/feature-types/Computed";
import { CountFeature } from "./features/factories/feature-types/Count";
import { UniqueCountFeature } from "./features/factories/feature-types/UniqueCount";
import { FeatureType } from "./features/featureTypes";
import { MockRedisService } from "./features/services/redis";

const redis = new MockRedisService();

const factories: Record<FeatureType, FeatureType<any>> = {
  [FeatureType.Count]: new CountFeature(redis),
  [FeatureType.UniqueCount]: new UniqueCountFeature(redis),
  [FeatureType.Computed]: new ComputedFeature(),
};

export function createEngine() {}

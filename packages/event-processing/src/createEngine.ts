import { UniqueCountFeature } from "./features/feature-factories/UniqueCount";
import { CountFeature } from "./features/feature-factories/Count";
import { MockRedisService } from "./features/services/redis";
import { ComputedFeature } from "./features/feature-factories/Computed";
import { FeatureType } from "./features/featureTypes";
import { FeatureFactory } from "./features/feature-factories/interface";

const redis = new MockRedisService();

const factories: Record<FeatureType, FeatureFactory<any>> = {
  [FeatureType.Count]: new CountFeature(redis),
  [FeatureType.UniqueCount]: new UniqueCountFeature(redis),
  [FeatureType.Computed]: new ComputedFeature(),
};

export function createEngine() {}

import { FeatureDef } from "../../features";

export interface FeatureService {
  getFeatureById(id: string): FeatureDef | undefined;
}

import { type Rule } from "@prisma/client";
import { type TypedData } from "event-processing";

export type FeatureSuccess = {
  type: "success";
  data: TypedData;
};

export type FeatureError = {
  type: "error";
  message: string;
};
export type FeatureResult = FeatureSuccess | FeatureError;

export type AnnotatedFeature = {
  featureId: string;
  featureName: string;
  rule?: Rule;
  result: FeatureResult;
};

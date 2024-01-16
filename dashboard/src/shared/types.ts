import { TSchema, TypedData } from "event-processing";

export type FeaturePathItem = {
  featureId: string;
  schema: TSchema;
};

export type AnnotatedFeature = {
  featureId: string;
  featureName: string;
  result:
    | {
        type: "error";
        message: string;
      }
    | {
        type: "success";
        data: TypedData;
      };
};

export type DataPath = {
  nodeId: string;
  path: string[];
  schema: TSchema;
};

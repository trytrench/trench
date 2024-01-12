import { TypedData } from "event-processing";

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

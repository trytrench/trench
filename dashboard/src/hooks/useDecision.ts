import { useMemo } from "react";
import { AnnotatedFeature } from "~/shared/types";
import { api } from "~/utils/api";

export const useDecision = (features: AnnotatedFeature[]) => {
  const { data: decisions } = api.decisions.list.useQuery();

  const decisionFeature = useMemo(
    () => features.find((feature) => feature.featureName === "Decision"),
    [features]
  );

  return useMemo(
    () =>
      decisions?.find(
        (decision) => decision.id === decisionFeature?.result.data?.value
      ),
    [decisions, decisionFeature]
  );
};

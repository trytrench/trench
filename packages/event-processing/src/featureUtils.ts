import { GlobalStateKey, db, prisma } from "databases";
import { FeatureResult, TrenchEvent } from "./features/types";

export type EngineResult = {
  event: TrenchEvent;
  featureResults: Record<string, FeatureResult>;
};
export async function writeEngineResultsToStore({
  results,
}: {
  results: EngineResult[];
}) {
  results.forEach(async ({ event, featureResults }) => {
    // db.insert({})
  });
}

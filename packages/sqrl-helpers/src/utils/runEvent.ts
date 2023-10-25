import { type Executable } from "sqrl";
import { createContext } from "./createContext";
import { SqrlManipulator } from "../SqrlManipulator";
import { Event } from "../types";

export type EventOutput = Awaited<ReturnType<typeof runEvent>>;

const EXCLUDED_FEATURES = ["EventData"];

export async function runEvent(
  event: Event,
  executable: Executable,
  datasetId: bigint
) {
  const ctx = createContext(datasetId);
  const manipulator = new SqrlManipulator();

  const execution = await executable.execute(ctx, {
    manipulator,
    inputs: {
      EventData: event,
    },
    featureTimeoutMs: 10000,
  });

  const completePromise = execution.fetchFeature("SqrlExecutionComplete");

  const features: Record<string, unknown> = {};
  const allFeatures = executable.getFeatures();

  await Promise.all(
    allFeatures.map(async (name) => {
      features[name] = (await execution.fetchValue(name)) as unknown;
    })
  );

  await completePromise;
  await manipulator.mutate(ctx);

  return {
    id: event.id,
    datasetId: datasetId.toString(),
    type: event.type,
    timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
    data: event.data,
    features: allFeatures.reduce(
      (acc, name) => {
        if (!EXCLUDED_FEATURES.includes(name) && !name.startsWith("Sqrl")) {
          acc[name] = features[name];
        }
        return acc;
      },
      {} as Record<string, unknown>
    ),
    entities: manipulator.entities,
  };
}

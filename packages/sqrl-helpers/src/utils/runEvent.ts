import { createSimpleContext, getGlobalLogger, type Executable } from "sqrl";
import { createContext } from "./createContext";
import { SqrlManipulator } from "../SqrlManipulator";
import { Event } from "../types";

export type EventOutput = Awaited<ReturnType<typeof runEvent>>;

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

  const eventFeatures: Record<string, unknown> = {};
  manipulator.eventFeatures.forEach((feature) => {
    eventFeatures[feature.name] = feature.value;
  });

  const entityIdToFeatures: Record<string, Record<string, unknown>> = {};
  manipulator.entityFeatures.forEach((feature) => {
    if (!entityIdToFeatures[feature.entityId])
      entityIdToFeatures[feature.entityId] = {};

    entityIdToFeatures[feature.entityId]![feature.name] = feature.value;
  });

  return {
    id: event.id,
    datasetId: datasetId.toString(),
    type: event.type,
    timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
    data: event.data,
    features: eventFeatures,
    labels: manipulator.eventLabels,
    entities: manipulator.entities.map((entity) => ({
      ...entity,
      labels: manipulator.entityLabels.filter(
        (label) => label.entityId === entity.id
      ),
      features: entityIdToFeatures[entity.id] ?? {},
    })),
  };
}

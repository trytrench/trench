import { db } from "databases";
import { getUnixTime } from "date-fns";
import { createSimpleContext, type Executable } from "sqrl";
import { VirtualFilesystem, compileFromFilesystem, type Instance } from "sqrl";
import { SqrlManipulator } from "./SqrlManipulator";

export interface Event {
  id: string;
  type: string;
  timestamp: Date;
  data: any;
}

export async function runEvent(event: Event, executable: Executable) {
  const ctx = createSimpleContext();

  // TODO: Extract this code to shared
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
    type: event.type,
    timestamp: event.timestamp,
    data: event.data,
    features: eventFeatures,
    labels: manipulator.eventLabels,
    entities: manipulator.entities.map((entity) => ({
      ...entity,
      features: entityIdToFeatures[entity.id] ?? {},
    })),
  };
}

export async function batchUpsert(
  events: Awaited<ReturnType<typeof runEvent>>[]
) {
  const values = events.flatMap((event) => {
    if (event.entities.length === 0) {
      return [
        {
          event_id: event.id,
          event_type: event.type,
          event_timestamp: getUnixTime(event.timestamp),
          event_data: event.data,
          event_features: event.features,
        },
      ];
    } else {
      event.entities.map((entity) => ({
        event_id: event.id,
        event_type: event.type,
        event_timestamp: getUnixTime(event.timestamp),
        event_data: event.data,
        event_features: event.features,
        entity_id: entity.id,
        entity_name: entity.features.Name || entity.id,
        entity_type: entity.type,
        entity_features: entity.features,
        relation: entity.relation,
      }));
    }
  });

  try {
    await db.insert({
      table: "event_entity",
      values,
      format: "JSONEachRow",
    });
    await db.insert({
      table: "event_labels",
      values: events.flatMap((event) =>
        event.labels.map((label) => ({
          event_id: event.id,
          event_type: event.type,
          event_timestamp: getUnixTime(event.timestamp),
          event_features: event.features,
          label: label.label,
          type: label.type,
          status: "ADDED",
        }))
      ),
      format: "JSONEachRow",
    });
  } catch (error) {
    console.error("Error inserting data into ClickHouse:", error);
  }
}

export const compileSqrl = async (
  instance: Instance,
  files: Record<string, string>
) => {
  const fs = new VirtualFilesystem(files);

  return compileFromFilesystem(instance, fs);
};

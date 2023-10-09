import { getUnixTime } from "date-fns";
import { customAlphabet } from "nanoid";
import { createSimpleContext, type Executable } from "sqrl";
import { SqrlManipulator } from "~/lib/SqrlManipulator";
import { db } from "~/server/db";

export interface Event {
  timestamp: string;
  type: string;
  data: Record<string, any>;
}

const nanoid = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  21
);

export async function runEvent(event: Event, executable: Executable) {
  const ctx = createSimpleContext();
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
    id: nanoid(),
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

export async function batchUpsert(
  events: Awaited<ReturnType<typeof runEvent>>[],
  datasetId: string
) {
  try {
    await db.insert({
      table: "event_labels",
      values: events.flatMap((event) =>
        event.labels.map((label) => ({
          created_at: getUnixTime(new Date()),
          event_id: event.id,
          label: label.label,
          type: label.type,
          status: "ADDED",
          dataset_id: datasetId,
        }))
      ),
      format: "JSONEachRow",
    });

    await db.insert({
      table: "entity_labels",
      values: events
        .filter((event) => event.entities.length)
        .flatMap((event) =>
          event.entities
            .filter((entity) => entity.labels.length)
            .flatMap((entity) =>
              entity.labels.map((label) => ({
                created_at: getUnixTime(new Date()),
                entity_id: entity.id,
                type: label.labelType,
                label: label.label,
                status: "ADDED",
                dataset_id: datasetId,
              }))
            )
        ),
      format: "JSONEachRow",
    });

    await db.insert({
      table: "event_entity",
      values: events.flatMap((event) =>
        event.entities.length
          ? event.entities.map((entity) => ({
              created_at: getUnixTime(new Date()),
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
              dataset_id: datasetId,
            }))
          : {
              created_at: getUnixTime(new Date()),
              event_id: event.id,
              event_type: event.type,
              event_timestamp: getUnixTime(event.timestamp),
              event_data: event.data,
              event_features: event.features,
              dataset_id: datasetId,
            }
      ),
      format: "JSONEachRow",
    });
  } catch (error) {
    console.error("Error inserting data into ClickHouse:", error);
  }
}

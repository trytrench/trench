import { db } from "databases";
import { getUnixTime } from "date-fns";
import { createSimpleContext, getGlobalLogger, type Executable } from "sqrl";
import { VirtualFilesystem, compileFromFilesystem, type Instance } from "sqrl";
import { SqrlManipulator } from "./SqrlManipulator";
import { SimpleContext } from "sqrl/lib/platform/Trace";
import { SimpleDatabaseSet } from "sqrl/lib/platform/DatabaseSet";

export interface Event {
  id: string;
  type: string;
  timestamp: Date;
  data: any;
}

export function createContext(databaseId: string) {
  return new SimpleContext(
    new SimpleDatabaseSet(databaseId),
    getGlobalLogger()
  );
}

export async function runEvent(
  event: Event,
  executable: Executable,
  datasetId: string
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
      const feature = await execution.fetchValue(name);
      features[name] = feature;
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
  await db.insert({
    table: "event_labels",
    values: events.flatMap((event) =>
      event.labels.length > 0
        ? event.labels.map((label) => ({
            created_at: getUnixTime(new Date()),
            dataset_id: datasetId,
            event_id: event.id,
            label: label.label,
            type: label.type,
            status: "ADDED",
          }))
        : [
            {
              created_at: getUnixTime(new Date()),
              dataset_id: datasetId,
              event_id: event.id,
            },
          ]
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
            entity.labels.length > 0
              ? entity.labels.map((label) => ({
                  created_at: getUnixTime(new Date()),
                  dataset_id: datasetId,
                  entity_id: entity.id,
                  type: label.labelType,
                  label: label.label,
                  status: "ADDED",
                }))
              : [
                  {
                    created_at: getUnixTime(new Date()),
                    dataset_id: datasetId,
                    entity_id: entity.id,
                  },
                ]
          )
      ),
    format: "JSONEachRow",
  });

  await db.insert({
    table: "event_entity",
    values: events.flatMap((event) =>
      event.entities.length > 0
        ? event.entities.map((entity) => ({
            created_at: getUnixTime(new Date()),
            dataset_id: datasetId,
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
          }))
        : [
            {
              created_at: getUnixTime(new Date()),
              dataset_id: datasetId,
              event_id: event.id,
              event_type: event.type,
              event_timestamp: getUnixTime(event.timestamp),
              event_data: event.data,
              event_features: event.features,
            },
          ]
    ),
    format: "JSONEachRow",
  });
}

export const compileSqrl = async (
  instance: Instance,
  files: Record<string, string>
) => {
  const fs = new VirtualFilesystem(files);

  return compileFromFilesystem(instance, fs);
};

import { db } from "databases";
import { getUnixTime } from "date-fns";
import { runEvent } from "sqrl-helpers";

export async function batchInsertEvents(
  events: Awaited<ReturnType<typeof runEvent>>[],
  datasetId: string
) {
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
}

import { db } from "databases";
import { getUnixTime } from "date-fns";
import { runEvent } from "sqrl-helpers";

export async function batchInsertEvents(
  events: Awaited<ReturnType<typeof runEvent>>[],
  datasetId: bigint
) {
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
            features: event.features,
            entity_id: entity.id,
            entity_type: entity.type,
            dataset_id: datasetId,
          }))
        : {
            created_at: getUnixTime(new Date()),
            event_id: event.id,
            event_type: event.type,
            event_timestamp: getUnixTime(event.timestamp),
            event_data: event.data,
            features: event.features,
            dataset_id: datasetId,
          }
    ),
    format: "JSONEachRow",
  });
}

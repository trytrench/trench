import { ClickHouseClient } from "@clickhouse/client";
import { getUnixTime } from "date-fns";
import { compileSqrl, createSqrlInstance, type Event } from "sqrl-helpers";
import { EventOutput, runEvent } from "sqrl-helpers/src/utils/runEvent";

export async function processEvents(props: {
  events: Event[];
  files: Record<string, string>;
  datasetId: bigint;
}): Promise<EventOutput[]> {
  const { events, files, datasetId } = props;

  const results: Awaited<ReturnType<typeof runEvent>>[] = [];
  const instance = await createSqrlInstance({
    config: {
      "redis.address": process.env.REDIS_URL,
    },
  });

  const { executable } = await compileSqrl(instance, files);

  for (const event of events) {
    results.push(await runEvent({ event, executable, datasetId }));
  }

  return results;
}

export async function batchInsertEvents(props: {
  events: EventOutput[];
  clickhouseClient: ClickHouseClient;
}) {
  const { events, clickhouseClient } = props;

  await clickhouseClient.insert({
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
            dataset_id: event.datasetId.toString(),
          }))
        : {
            created_at: getUnixTime(new Date()),
            event_id: event.id,
            event_type: event.type,
            event_timestamp: getUnixTime(event.timestamp),
            event_data: event.data,
            features: event.features,
            dataset_id: event.datasetId.toString(),
          }
    ),
    format: "JSONEachRow",
    clickhouse_settings: {
      async_insert: 1,
    },
  });
}

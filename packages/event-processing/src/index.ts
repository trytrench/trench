import { ClickHouseClient } from "@clickhouse/client";
import { getUnixTime } from "date-fns";
import { type Event } from "sqrl-helpers";
import { EventOutput, runEvent } from "sqrl-helpers/src/utils/runEvent";

import { GlobalStateKey, prisma } from "databases";
import { FeatureDef } from "./features/featureTypes";

export { DataType } from "./features/dataTypes";
export { FeatureType } from "./features/featureTypes";
export { createEngine, fetchCurrentEngineId } from "./engineUtils";
export {
  getEventsSince,
  fetchLastEventProcessedId,
  setLastEventProcessedId,
} from "./eventUtils";
export { writeEngineResultsToStore } from "./featureUtils";
export * from "./features/featureTypes";

/////////////// OLD CODE ///////////////
type DatasetData = {
  datasetId: bigint;
  code: Record<string, string>;
  lastEventLogId: string;
  startTime: Date | null;
  endTime: Date | null;
};
export async function getDatasetData(props: {
  datasetId: bigint;
}): Promise<DatasetData> {
  const { datasetId } = props;

  const res = await prisma.$queryRaw<DatasetData[]>`
        SELECT
          "Dataset"."id" AS "datasetId",
          "EventHandler"."code",
          "Dataset"."lastEventLogId",
          "Dataset"."startTime",
          "Dataset"."endTime"
        FROM "Dataset"
        JOIN "EventHandlerAssignment" ON "Dataset"."currentEventHandlerAssignmentId" = "EventHandlerAssignment"."id"
        JOIN "EventHandler" ON "EventHandlerAssignment"."eventHandlerId" = "EventHandler"."id"
        WHERE "Dataset"."id" = ${datasetId}
    `;

  if (res.length === 0) {
    throw new Error(`No Dataset found for datasetId ${datasetId}`);
  }

  return res[0]!;
}

/**
 * Get the next 1000 events to process.
 * If production, only get events that are not marked as sync.
 */
export async function getEvents(props: {
  lastEventLogId: string;
  startTime: Date | null;
  endTime: Date | null;
  isProduction: boolean;
}): Promise<Event[]> {
  const { lastEventLogId, isProduction, startTime, endTime } = props;

  if (isProduction) {
    return prisma.$queryRaw<Event[]>`
        SELECT "id", "type", "data", "timestamp"
        FROM "EventLog"
        WHERE (
          ${lastEventLogId}::text IS NULL
          OR "id" > ${lastEventLogId}
        )
        AND (
          NOT ("EventLog"."options" ? 'sync') -- The key 'sync' does not exist
          OR "EventLog"."options"->>'sync' = 'false' -- The key 'sync' exists and its value is 'false'
        )
        ORDER BY "id" ASC
        LIMIT 1000;
    `;
  } else {
    if (!startTime || !endTime) {
      throw new Error(
        `startTime and endTime must be provided when running a backfill worker`
      );
    }
    return prisma.$queryRaw<Event[]>`
        SELECT "id", "type", "data", "timestamp"
        FROM "EventLog"
        WHERE (
          ${lastEventLogId}::text IS NULL
          OR "id" > ${lastEventLogId}
        )
        AND "timestamp" >= ${startTime}
        AND "timestamp" <= ${endTime}
        ORDER BY "id" ASC
        LIMIT 1000;
    `;
  }
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

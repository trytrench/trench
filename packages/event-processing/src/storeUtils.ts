import { GlobalStateKey, db, prisma } from "databases";
import { getUnixTime } from "date-fns";
import { DataType, stringifyTypedData } from "./dataTypes";
import { EngineResult } from "./engine";
import { TrenchEvent } from "./feature-type-defs/featureTypeDef";

type FeatureTableRow = {
  engine_id: string;
  created_at: number;
  event_type: string;
  event_id: string;
  event_timestamp: number;
  feature_type: string;
  feature_id: string;
  entity_type: string[];
  entity_id: string[];
  data_type: string;
  value: string;
  value_Int64: number | null;
  value_Float64: number | null;
  value_String: string | null;
  value_Bool: boolean | null;
};

export async function writeEngineResultsToStore({
  results,
}: {
  results: EngineResult[];
}) {
  const rows: FeatureTableRow[] = results.map(
    ({ event, featureDef, featureResult, engineId }) => {
      const { dataType } = featureDef;
      const { assignedEntities, data } = featureResult;

      const safeValue = data.value || "";

      return {
        engine_id: engineId,
        created_at: getUnixTime(new Date()),
        event_type: event.type,
        event_id: event.id,
        event_timestamp: getUnixTime(event.timestamp),
        feature_type: featureDef.featureType,
        feature_id: featureDef.featureId,
        entity_type: assignedEntities.map(({ type }) => type),
        entity_id: assignedEntities.map(({ id }) => id),
        data_type: dataType,
        value: stringifyTypedData(data),
        value_Int64: dataType === DataType.Int64 ? Number(safeValue) : null,
        value_Float64: dataType === DataType.Float64 ? Number(safeValue) : null,
        value_String:
          dataType === DataType.String ? safeValue.toString() : null,
        value_Bool: dataType === DataType.Boolean ? Boolean(safeValue) : null,
      };
    }
  );

  await db.insert({
    table: "features",
    values: rows,
    format: "JSONEachRow",
    clickhouse_settings: {
      async_insert: 1,
    },
  });
}

type EventTableRow = {
  id: string;
  type: string;
  timestamp: number;
  data: object;
};

export function writeEventsToStore({ events }: { events: TrenchEvent[] }) {
  const rows: EventTableRow[] = events.map((event) => ({
    id: event.id,
    type: event.type,
    timestamp: getUnixTime(event.timestamp),
    data: event.data,
  }));
  return db.insert({
    table: "events",
    values: rows,
    format: "JSONEachRow",
    clickhouse_settings: {
      async_insert: 1,
    },
  });
}

import { GlobalStateKey, db, prisma } from "databases";
import { getUnixTime } from "date-fns";
import { DataType, encodeTypedData } from "./dataTypes";
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
  data_type: string | null;
  value: string | null;
  value_Int64: number | null;
  value_Float64: number | null;
  value_String: string | null;
  value_Bool: boolean | null;
  error: string | null;
  is_deleted: 1 | 0;
};

export async function writeEngineResultsToStore({
  results,
}: {
  results: EngineResult[];
}) {
  const rows: FeatureTableRow[] = results.map(
    ({ event, featureDef, featureResult, engineId }) => {
      const { dataType } = featureDef;
      const { type, output } = featureResult;

      const baseData = {
        engine_id: engineId,
        created_at: getUnixTime(new Date()),
        event_type: event.type,
        event_id: event.id,
        event_timestamp: getUnixTime(event.timestamp),
        feature_type: featureDef.featureType,
        feature_id: featureDef.featureId,
      };

      if (type === "error") {
        return {
          ...baseData,
          data_type: null,
          entity_type: [],
          entity_id: [],
          value: null,
          value_Int64: null,
          value_Float64: null,
          value_String: null,
          value_Bool: null,
          error: output.message,
          is_deleted: 0,
        };
      } else {
        const { data, assignedEntities } = output;
        const safeValue = data.value || "";

        return {
          ...baseData,
          entity_type: assignedEntities.map(({ type }) => type),
          entity_id: assignedEntities.map(({ id }) => id),
          data_type: dataType,
          value: encodeTypedData(data),
          value_Int64: dataType === DataType.Int64 ? Number(safeValue) : null,
          value_Float64:
            dataType === DataType.Float64 ? Number(safeValue) : null,
          value_String:
            dataType === DataType.String ? safeValue.toString() : null,
          value_Bool: dataType === DataType.Boolean ? Boolean(safeValue) : null,
          error: null,
          is_deleted: 0,
        };
      }
    }
  );

  const result = await db.insert({
    table: "features",
    values: rows,
    format: "JSONEachRow",
    clickhouse_settings: {
      async_insert: 1,
    },
  });

  return result;
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

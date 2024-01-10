import { GlobalStateKey, db, prisma } from "databases";
import { getUnixTime } from "date-fns";
import { TrenchEvent } from "./node-type-defs/nodeTypeDef";

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

type Feature = {
  featureId: string;
  dataType: string;
  value: any;
  assignedEntity: {
    type: string;
    id: string;
  };
};

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

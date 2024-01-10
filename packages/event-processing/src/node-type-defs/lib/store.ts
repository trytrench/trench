import { ClickhouseClient } from "databases";

type FeatureRow = {
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
  error: string | null;
  is_deleted: number;
};

export async function insertFeatureRow(db: ClickhouseClient, row: FeatureRow) {
  await db.insert({
    table: "features",
    values: [row],
    format: "JSONEachRow",
    clickhouse_settings: {
      async_insert: 1,
    },
  });
}

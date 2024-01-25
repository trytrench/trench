import { db } from "databases";
import { TrenchEvent } from "../functionTypeDef";
import { getUnixTime } from "date-fns";

export type FeatureRow = {
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
  value: string | null;
  value_Int64: number | null;
  value_Float64: number | null;
  value_String: string | null;
  value_Bool: boolean | null;
  error: string | null;
  is_deleted: number;
};

type EventTableRow = {
  id: string;
  type: string;
  timestamp: number;
  data: object;
};

export enum StoreTable {
  Features = "features",
  Events = "events",
}

// export async function insertFeatureRow(db: ClickhouseClient, row: FeatureRow) {
//   await db.insert({
//     table: StoreTable.Features,
//     values: [row],
//     format: "JSONEachRow",
//     clickhouse_settings: {
//       async_insert: 1,
//       wait_for_async_insert: 0,
//     },
//   });
// }

export type StoreRow =
  | {
      table: StoreTable.Features;
      row: FeatureRow;
    }
  | {
      table: StoreTable.Events;
      row: EventTableRow;
    };

const ALL_TABLES = [StoreTable.Features, StoreTable.Events];

export async function writeStoreRows({ rows }: { rows: StoreRow[] }) {
  await Promise.all(
    ALL_TABLES.map((table) => {
      const rowsForTable = rows.filter((r) => r.table === table);
      if (rowsForTable.length === 0) {
        return;
      }
      return db.insert({
        table,
        values: rowsForTable.map((r) => r.row),
        format: "JSONEachRow",
        clickhouse_settings: {
          async_insert: 1,
          wait_for_async_insert: 0,
        },
      });
    })
  );
}

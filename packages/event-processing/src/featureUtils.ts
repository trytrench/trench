import { GlobalStateKey, db, prisma } from "databases";
import { DataType, stringifyTypedData } from "./dataTypes";
import { EngineResult } from "./engine";

type FeatureTableRow = {
  event_id: string;
  feature_type: string;
  feature_id: string;
  entity_type: string[];
  entity_id: string[];
  value: string;
  value_Int64: number | null;
  value_Float64: number | null;
  value_String: string | null;
  value_Bool: boolean | null;
};

type EventTableRow = {
  id: string;
  type: string;
  data: object;
  timestamp: Date;
};

export async function writeEngineResultsToStore({
  results,
}: {
  results: EngineResult[];
}) {
  const rows: FeatureTableRow[] = results.map(
    ({ event, featureDef, featureResult }) => {
      const { dataType } = featureDef;
      const { assignedEntities, data } = featureResult;

      const safeValue = data.value || "";

      return {
        event_id: event.id,
        feature_type: featureDef.featureType,
        feature_id: featureDef.featureId,
        entity_type: assignedEntities.map(({ type }) => type),
        entity_id: assignedEntities.map(({ id }) => id),
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

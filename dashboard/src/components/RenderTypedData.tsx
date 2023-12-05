import { DataType, type TypedData } from "event-processing";
import { EntityChip } from "./EntityChip";

export function RenderTypedData({ data }: { data: TypedData[DataType] }) {
  switch (data.type) {
    case DataType.Entity:
      return <EntityChip entity={data.value} />;
    case DataType.Boolean:
      return <div>{data.value ? "True" : "False"}</div>;
    case DataType.String:
      return <div>{data.value}</div>;
    case DataType.Float64:
    case DataType.Int64:
      return <div>{data.value}</div>;
  }
}

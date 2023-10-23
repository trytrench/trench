import { JsonFilter, JsonFilterOp } from "~/shared/jsonFilter";
import { ParamSchema, opsByDataType } from "./typeData";
import {
  EntityFilters,
  EventFilters,
  GenericFilters,
} from "~/shared/validation";

const getAvailableOps = (dataType: string): JsonFilterOp[] => {
  return Object.keys(opsByDataType[dataType] ?? {}) as JsonFilterOp[];
};

const getParamSchema = (dataType: string, op: JsonFilterOp): ParamSchema => {
  let schema = opsByDataType[dataType]?.[op] ?? { type: "none", count: 0 };
  return { type: dataType, ...schema };
};

function formatSingle(value: any, type: string) {
  if (type === "text") {
    return `'${value}'`;
  }
  if (type === "number") {
    return value;
  }
  if (type === "none") {
    return "";
  }
  if (type === "boolean") {
    return value ? "true" : "false";
  }
  return "--";
}

// TODO: make this return JSX instead
function format(filter: JsonFilter | undefined) {
  if (!filter) return "";
  const rightType = getParamSchema(filter.dataType, filter.op);

  if (rightType.count === "many" || rightType.count > 1) {
    if (filter.value.length > 3) {
      return `[${filter.value.length} values]`;
    }

    const formattedVals = filter.value.map((item: any) =>
      formatSingle(item, rightType.type!)
    );
    return `(${formattedVals.join(", ")})`;
  }

  return formatSingle(filter.value, rightType.type!);
}

//

function toEventFilters(filters: GenericFilters): EventFilters {
  if (!filters) return undefined;
  return {
    eventType: filters.type,
    eventLabels: filters.labels,
    eventFeatures: filters.features,
    // todo: daterange
  };
}

function toEntityFilters(filters: GenericFilters): EntityFilters {
  if (!filters) return undefined;
  return {
    entityType: filters.type,
    entityLabels: filters.labels,
    entityFeatures: filters.features,
    // todo: daterange
  };
}

//

export {
  getAvailableOps,
  getParamSchema,
  format,
  toEventFilters,
  toEntityFilters,
};

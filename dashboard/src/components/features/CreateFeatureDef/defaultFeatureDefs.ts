// Default (blank) feature definitions for each feature type

import { DataType, FeatureType } from "~/lib/create-feature/types";

function dummyDataTypeStr(dataType: DataType) {
  switch (dataType) {
    case DataType.Boolean:
      return "false";
    case DataType.Number:
      return "0";
    case DataType.Object:
      return "{}";
    case DataType.String:
      return '""';
  }
}

function defaultFeatureDef(
  name: string,
  type: FeatureType,
  dataType: DataType
) {
  const dummyStr = dummyDataTypeStr(dataType);

  const defaults = {
    Computed: {
      config: {
        compiledJs: `async function getFeature(input) {\n    return ${dummyStr};\n}\n`,
        tsCode: `  return ${dummyStr}`,
        depsMap: {},
      },
    },
    // todo...
  } as Record<FeatureType, any>;

  return {
    name,
    type,
    dataType,
    deps: [],
    ...defaults[type],
  };
}

export { defaultFeatureDef };

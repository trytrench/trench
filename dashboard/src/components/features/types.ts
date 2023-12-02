// TODO

enum FeatureType {
  Computed = "computed",
  Count = "count",
  Entity = "entity",
  Decision = "decision",
}

enum DataType {
  Number = "number",
  Boolean = "boolean",
  String = "string",
}

// TEMPORARY (need to finalize smth)

type ComputedFeature = {
  id: string;
  type: FeatureType.Computed;
  name: string;
  importAlias: string;
  dataType: DataType;
  getter: (deps: Record<string, any>) => any;
};

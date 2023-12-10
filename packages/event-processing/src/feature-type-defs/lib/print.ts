import { FeatureDef } from "../featureTypeDef";

function truncId(id: string) {
  return id.slice(0, 8);
}

export function printFDef(def: FeatureDef) {
  return `"${def.featureName}" (${truncId(def.featureId)})`;
}

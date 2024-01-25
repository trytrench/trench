import { NodeDef } from "../nodeDef";

export function truncId(id: string) {
  return id.slice(0, 8);
}

export function printNodeDef(def: NodeDef) {
  return `"${def.name}" (${truncId(def.id)})`;
}

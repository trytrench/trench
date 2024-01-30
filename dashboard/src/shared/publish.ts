import { GlobalStateKey, prisma } from "databases";
import {
  NODE_INCLUDE_ARGS,
  prismaNodeToNodeDef,
} from "../server/lib/prismaConverters";
import {
  type NodeDef,
  FnType,
  hasFnType,
  getFnTypeDef,
  TSchema,
  TypeName,
  createDataType,
  NodeDefAny,
} from "event-processing";
import { assert } from "../../../packages/common/src";

export function prune(nodeDefs: NodeDef[]): NodeDef[] {
  const map = new Map<string, NodeDef>();
  const allDependsOn = new Set<string>();
  for (const nodeDef of nodeDefs) {
    map.set(nodeDef.id, nodeDef);

    for (const dep of nodeDef.dependsOn) {
      allDependsOn.add(dep);
    }
  }

  const featureIdsToCache = new Set<string>();

  const nodeDefs2 = nodeDefs.filter((def) => {
    if (hasFnType(def, FnType.CacheEntityFeature)) {
      featureIdsToCache.add(def.fn.config.featureId);
      return allDependsOn.has(def.id);
    } else {
      return true;
    }
  });

  return nodeDefs2.filter((def) => {
    if (hasFnType(def, FnType.CacheEntityFeature)) {
      return featureIdsToCache.has(def.fn.config.featureId);
    } else {
      return true;
    }
  });
}

// Returns list of node Ids with errors
export function checkErrors(nodeDefs: NodeDefAny[]): Record<string, string> {
  const errors: Record<string, string> = {};

  const allNodeDefs = nodeDefs;

  allNodeDefs.forEach((nodeDef) => {
    const { getDataPaths } = getFnTypeDef(nodeDef.fn.type);
    const dataPaths = getDataPaths(nodeDef.inputs);

    dataPaths.forEach((path) => {
      const pathNode = allNodeDefs.find((def) => def.id === path.nodeId);
      assert(pathNode, `Node ${path.nodeId} not found`);

      const pathNodeReturnSchema = pathNode.fn.returnSchema;
      const actualSchema = getSchemaAtPath(pathNodeReturnSchema, path.path);

      const expectedSchemaType = createDataType(path.schema);

      if (!actualSchema) {
        errors[nodeDef.id] = `Node ${nodeDef.id} uses invalid data path`;
      } else if (!expectedSchemaType.isSuperTypeOf(actualSchema)) {
        errors[nodeDef.id] = `Node ${nodeDef.id} uses invalid data path`;
      }
    });
  });

  return errors;
}

function getSchemaAtPath(schema: TSchema, path: string[]): TSchema | null {
  let currentSchema = schema;
  for (const key of path) {
    if (currentSchema.type !== TypeName.Object) return null;
    const nextSchema = currentSchema.properties[key];
    if (!nextSchema) return null;
    currentSchema = nextSchema;
  }
  return currentSchema;
}

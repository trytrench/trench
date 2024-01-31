import {
  FnDef,
  FnType,
  NodeDefAny,
  TSchema,
  TypeName,
  buildNodeDefWithFn,
  createDataType,
  getFnTypeDef,
  hasFnType,
  type NodeDef,
} from "event-processing";
import { assert, generateNanoId } from "../../../packages/common/src";

export function prune(nodeDefs: NodeDef[]): NodeDef[] {
  const allDependsOn = new Set<string>();
  for (const nodeDef of nodeDefs) {
    for (const dep of nodeDef.dependsOn) {
      allDependsOn.add(dep);
    }
  }

  const featureIdsToCache = new Set<string>();

  // Remove unused get feature nodes
  // Remove existing cache nodes
  const newNodes = nodeDefs.filter((def) => {
    if (hasFnType(def, FnType.GetEntityFeature)) {
      const isDependedOn = allDependsOn.has(def.id);

      // Cache features that are depended on
      if (isDependedOn) {
        featureIdsToCache.add(def.fn.config.featureId);
        return true;
      } else {
        return false;
      }
    }

    if (hasFnType(def, FnType.CacheEntityFeature)) return false;

    return true;
  });

  // Cache the feature every time we log it
  for (const nodeDef of nodeDefs) {
    if (hasFnType(nodeDef, FnType.LogEntityFeature)) {
      const { featureId } = nodeDef.fn.config;

      if (featureIdsToCache.has(featureId)) {
        const cacheNode = buildNodeDefWithFn(FnType.CacheEntityFeature, {
          ...nodeDef,
          id: generateNanoId(),
          name: `Cache ${featureId}`,
          fn: {
            ...nodeDef.fn,
            id: generateNanoId(),
            type: FnType.CacheEntityFeature,
          },
        });

        newNodes.push({
          ...cacheNode,
          fn: cacheNode.fn as FnDef<FnType>,
          dependsOn: nodeDef.dependsOn,
        });
      }
    }
  }

  return newNodes;
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
        errors[nodeDef.id] = `Invalid data path`;
      } else if (!expectedSchemaType.isSuperTypeOf(actualSchema)) {
        errors[nodeDef.id] = `Invalid data path`;
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

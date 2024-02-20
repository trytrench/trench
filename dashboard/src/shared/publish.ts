import {
  type FnDef,
  FnType,
  type NodeDefAny,
  TypeName,
  buildNodeDefWithFn,
  getFnTypeDef,
  hasFnType,
  type DataPathInfoGetter,
  type NodeDef,
  type TSchema,
} from "event-processing";
import { generateNanoId } from "../../../packages/common/src";

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

  const nodeDefMap = new Map<string, NodeDefAny>();
  allNodeDefs.forEach((def) => {
    nodeDefMap.set(def.id, def);
  });

  const getDataPathInfo: DataPathInfoGetter = (dataPath) => {
    const { nodeId, path } = dataPath;
    const nodeDef = nodeDefMap.get(nodeId);
    if (!nodeDef) return { schema: null };
    const schema = getSchemaAtPath(nodeDef.fn.returnSchema, path);
    return { schema };
  };

  allNodeDefs.forEach((nodeDef) => {
    const { getDataPaths, validateInputs, inputSchema } = getFnTypeDef(
      nodeDef.fn.type
    );
    const dataPaths = getDataPaths(nodeDef.inputs);

    // Check all data paths are valid
    for (const path of dataPaths) {
      const actualSchema = getDataPathInfo(path).schema;
      if (!actualSchema) {
        errors[nodeDef.id] = `Invalid data path: [${
          path.nodeId
        }, ${path.path.join(".")}]`;
        return;
      }
    }

    // Check inputs are valid
    const result = inputSchema.safeParse(nodeDef.inputs);
    if (!result.success) {
      errors[nodeDef.id] = `Input parsing failed: ${result.error.message}`;
      return;
    }

    // Check fn-specific validation
    const fnValidateResult = validateInputs({
      inputs: nodeDef.inputs,
      fnDef: nodeDef.fn,
      getDataPathInfo,
    });
    if (!fnValidateResult.success) {
      errors[nodeDef.id] = `Fn validation failed: ${fnValidateResult.error}`;
    }
  });

  return errors;
}

export function getSchemaAtPath(
  schema: TSchema,
  path: string[]
): TSchema | null {
  let currentSchema = schema;
  for (const key of path) {
    if (currentSchema.type !== TypeName.Object) return null;
    const nextSchema = currentSchema.properties[key];
    if (!nextSchema) return null;
    currentSchema = nextSchema;
  }
  return currentSchema;
}

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
  type TSchema,
  TypeName,
  createDataType,
  type NodeDefAny,
  type DataPathInfoGetter,
  FnTypeCompileContextMap,
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
export function checkErrors(
  nodeDefs: NodeDefAny[],
  compileContextMap: FnTypeCompileContextMap
): Record<string, string> {
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
      ctx: compileContextMap[nodeDef.fn.type],
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

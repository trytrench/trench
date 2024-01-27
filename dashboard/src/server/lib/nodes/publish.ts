import { GlobalStateKey, prisma } from "databases";
import { NODE_INCLUDE_ARGS, prismaNodeToNodeDef } from "../prismaConverters";
import { type NodeDef, FnType } from "event-processing";

export async function publish() {
  const nodeDefsRaw = await prisma.node.findMany({
    include: NODE_INCLUDE_ARGS,
  });

  const nodeDefs = nodeDefsRaw.map(prismaNodeToNodeDef);

  const prunedFnDefs = prune(nodeDefs);

  const engine = await prisma.executionEngine.create({
    data: {
      nodeSnapshots: {
        createMany: {
          data: prunedFnDefs.map((nodeDef) => ({
            nodeSnapshotId: nodeDef.snapshotId,
          })),
        },
      },
    },
  });

  await prisma.globalState.upsert({
    where: {
      key: GlobalStateKey.ActiveEngineId,
    },
    create: {
      key: GlobalStateKey.ActiveEngineId,
      value: engine.id,
    },
    update: { value: engine.id },
  });
}

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
    switch (def.fn.type) {
      case FnType.GetEntityFeature: {
        featureIdsToCache.add(def.fn.config.featureId);
        return allDependsOn.has(def.id);
      }
      default:
        return true;
    }
  });

  return nodeDefs2.filter((def) => {
    switch (def.fn.type) {
      case FnType.CacheEntityFeature: {
        return featureIdsToCache.has(def.fn.config.featureId);
      }
      default:
        return true;
    }
  });
}

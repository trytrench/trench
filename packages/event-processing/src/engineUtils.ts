import { GlobalStateKey, prisma } from "databases";
import { ExecutionEngine } from "./engine";
import { NodeDef, NodeType } from "./node-type-defs";

export function getNodeDefFromSnapshot(snapshot: {
  id: string;
  config: any;
  deps: string[];
  eventTypes: string[];
  node: {
    id: string;
    type: string;
    dataType: any;
    name: string;
  };
}): NodeDef {
  return {
    id: snapshot.node.id,
    type: snapshot.node.type as NodeType,
    name: snapshot.node.name,
    dependsOn: new Set(snapshot.deps),
    returnSchema: snapshot.node.dataType as any,
    config: snapshot.config as object,
  };
}

async function fetchFeatureDefSnapshots({
  engineId,
}: {
  engineId: string;
}): Promise<NodeDef[]> {
  // Check for new engine
  const engineDef = await prisma.executionEngine.findUnique({
    where: { id: engineId },
    include: {
      nodeSnapshots: {
        include: {
          nodeSnapshot: {
            include: {
              node: true,
            },
          },
        },
      },
    },
  });

  if (!engineDef) {
    throw new Error(`No engine found for engineId ${engineId}`);
  }
  const featureDefs = engineDef.nodeSnapshots.map((item) => {
    const snapshot = item.nodeSnapshot;
    return getNodeDefFromSnapshot(snapshot);
  });

  return featureDefs;
}

export async function fetchCurrentEngineId() {
  const state = await prisma.globalState.findUnique({
    where: { key: GlobalStateKey.ActiveEngineId },
  });
  return state?.value ?? null;
}

export async function createEngine({ engineId }: { engineId: string }) {
  const nodeDefs = await fetchFeatureDefSnapshots({ engineId });
  return new ExecutionEngine({ nodeDefs, engineId, getContext: () => null });
}

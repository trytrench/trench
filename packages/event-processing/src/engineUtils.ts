import { GlobalStateKey, prisma } from "databases";
import { ExecutionEngine } from "./engine";
import { NodeDef, NodeType } from "./node-type-defs";
import { TSchema } from "./data-types";

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
  return engineDef.nodeSnapshots.map((obj) => {
    const snapshot = obj.nodeSnapshot;
    const { node } = snapshot;
    return {
      id: snapshot.nodeId,
      type: node.type as NodeType,
      eventType: node.eventType,
      name: node.name,
      config: snapshot.config,
      returnSchema: snapshot.returnSchema as unknown as TSchema,
      dependsOn: new Set(snapshot.dependsOn),
    };
  });
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

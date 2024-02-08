import { GlobalStateKey, prisma } from "databases";
import { ExecutionEngine } from "./engine";
import { NodeDef, FnType, FnDef } from "../function-type-defs";
import { TSchema } from "../data-types";

async function fetchNodeDefSnapshots({
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
              fnSnapshot: {
                include: {
                  fn: true,
                },
              },
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
    const nodeSnapshot = obj.nodeSnapshot;
    const { node, fnSnapshot } = nodeSnapshot;
    return {
      id: nodeSnapshot.nodeId,
      eventType: node.eventType,
      name: node.name,
      inputs: nodeSnapshot.inputs as unknown as any,
      dependsOn: new Set(nodeSnapshot.dependsOn),
      fn: {
        id: fnSnapshot.fnId,
        type: fnSnapshot.fn.type as any,
        name: fnSnapshot.fn.name,
        config: fnSnapshot.config as unknown as any,
        returnSchema: fnSnapshot.returnSchema as unknown as TSchema,
      },
    } satisfies NodeDef as any;
  });
}

export async function fetchCurrentEngineId() {
  const state = await prisma.globalState.findUnique({
    where: { key: GlobalStateKey.ActiveEngineId },
  });
  return state?.value ?? null;
}

export async function createEngine({ engineId }: { engineId: string }) {
  const nodeDefs = await fetchNodeDefSnapshots({ engineId });
  return new ExecutionEngine({ nodeDefs, engineId, getContext: () => null });
}

import {
  Prisma,
  type Fn as PrismaFn,
  type FnSnapshot as PrismaFnSnapshot,
  type Node as PrismaNode,
  type NodeSnapshot as PrismaNodeSnapshot,
} from "@prisma/client";
import {
  type FnDef,
  type FnType,
  type TSchema,
  type NodeDef,
  NodeDefsMap,
  FnDefsMap,
} from "event-processing";

type FnSnapshot = PrismaFnSnapshot & {
  fn: PrismaFn;
};

export function prismaFnSnapshotToFnDef(val: FnSnapshot): FnDefsMap[FnType] {
  const fn = val.fn;

  return {
    id: fn.id,
    snapshotId: val.id,
    type: fn.type as unknown as FnType,
    name: fn.name,
    returnSchema: val.returnSchema as unknown as TSchema,
    config: val.config as unknown as any,
  } satisfies FnDef as any;
}

export function prismaFnToFnDef(
  val: PrismaFn & { snapshots: PrismaFnSnapshot[] }
) {
  const snapshot = val.snapshots[0];
  if (!snapshot) {
    throw new Error("No snapshot found for fn. This should never happen");
  }
  return prismaFnSnapshotToFnDef({
    ...snapshot,
    fn: val,
  });
}

export function prismaToNodeDef(
  val: PrismaNode & {
    snapshots: (PrismaNodeSnapshot & {
      fnSnapshot: FnSnapshot;
    })[];
  }
): NodeDef<FnType> {
  const snapshot = val.snapshots[0];
  if (!snapshot) {
    throw new Error("No snapshot found for node. This should never happen");
  }

  const fn = prismaFnSnapshotToFnDef(snapshot.fnSnapshot);
  return {
    id: val.id,
    name: val.name,
    snapshotId: snapshot.id,
    eventType: val.eventType,
    inputs: snapshot.inputs as unknown as any,
    dependsOn: new Set(snapshot.dependsOn),
    fn: fn as any,
  };
}

export const FN_INCLUDE_ARGS = {
  snapshots: {
    orderBy: { createdAt: "desc" },
    take: 1,
  },
} satisfies Prisma.FnInclude;

export const NODE_INCLUDE_ARGS = {
  snapshots: {
    include: { fnSnapshot: { include: { fn: true } } },
    orderBy: { createdAt: "desc" },
    take: 1,
  },
} satisfies Prisma.NodeInclude;

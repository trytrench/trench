import {
  type Function as PrismaFunction,
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

export function prismaToFnDef(val: PrismaFunction): FnDef<FnType> {
  return {
    id: val.id,
    type: val.type as unknown as FnType,
    name: val.name,
    returnSchema: val.returnSchema as unknown as TSchema,
    config: val.config as unknown as any,
  } as any;
}

export function prismaToNodeDef(
  val: PrismaNode & {
    snapshots: (PrismaNodeSnapshot & {
      function: PrismaFunction;
    })[];
  }
): NodeDef<FnType> {
  const snapshot = val.snapshots[0];
  if (!snapshot) {
    throw new Error("No snapshot found for node. This should never happen");
  }

  const fn = prismaToFnDef(snapshot.function);
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

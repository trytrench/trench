import { prisma } from "databases";
import { fnDefSchema } from "event-processing";
import { z } from "zod";
import {
  FN_INCLUDE_ARGS,
  NODE_INCLUDE_ARGS,
  prismaFnToFnDef,
  prismaNodeToNodeDef,
} from "../prismaConverters";
import { publish } from "./publish";

export const updateFnDefArgsSchema = fnDefSchema
  .pick({ config: true, returnSchema: true, name: true, type: true })
  .merge(z.object({ id: z.string() }));

type UpdateFnDefArgs = z.infer<typeof updateFnDefArgsSchema>;

export async function updateFnDef(input: UpdateFnDefArgs) {
  const shouldAddSnapshot = input.config || input.returnSchema;
  const result = await prisma.fn.update({
    where: { id: input.id },
    data: {
      name: input.name,
      type: input.type,
      snapshots: shouldAddSnapshot
        ? {
            create: {
              returnSchema: input.returnSchema as unknown as any,
              config: input.config as unknown as any,
            },
          }
        : undefined,
    },
    include: FN_INCLUDE_ARGS,
  });

  const resultFnDef = prismaFnToFnDef(result);

  if (!shouldAddSnapshot) {
    return resultFnDef;
  } else {
    // If we created a new function snapshot, we want to update all nodes that depend on it,
    // by creating a new snapshot that points to the latest function

    const nodes = await prisma.node.findMany({
      where: { fnId: input.id },
      include: NODE_INCLUDE_ARGS,
    });

    const nodeDefs = nodes.map(prismaNodeToNodeDef);

    await Promise.all(
      nodeDefs.map(async (nodeDef) => {
        await prisma.node.update({
          where: { id: nodeDef.id },
          data: {
            snapshots: {
              create: {
                fnSnapshotId: resultFnDef.snapshotId,
                inputs: nodeDef.inputs as unknown as any,
              },
            },
          },
        });
      })
    );

    // Publish a new engine version, if any nodes were updated
    if (nodeDefs.length > 0) {
      await publish();
    }

    return resultFnDef;
  }
}

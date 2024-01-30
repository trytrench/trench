import { type NodeDef, nodeDefSchema } from "event-processing";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prismaNodeSnapshotToNodeDef } from "../../lib/prismaConverters";
import { Prisma } from "@prisma/client";
import { prune } from "../../lib/nodes/publish";
import { prisma } from "databases";
import { uniqBy } from "lodash";
import { assert, generateNanoId } from "../../../../../packages/common/src";

export const editorRouter = createTRPCRouter({
  getLatestEngine: protectedProcedure.query(async ({ ctx }) => {
    const latestEngineId = await ctx.prisma.executionEngine.findFirstOrThrow({
      orderBy: { createdAt: "desc" },
    });
    return {
      engineId: latestEngineId.id,
      nodeDefs: await getEngineNodeDefs(latestEngineId.id),
    };
  }),
  getEngine: protectedProcedure
    .input(z.object({ engineId: z.string() }))
    .query(async ({ input }) => {
      const engineId = input.engineId;
      return {
        engineId: engineId,
        nodeDefs: await getEngineNodeDefs(engineId),
      };
    }),
  saveNewEngine: protectedProcedure
    .input(z.object({ nodeDefs: z.array(nodeDefSchema) }))
    .mutation(async ({ input }) => {
      // Upsert new nodes
      const nodeDefs = prune(input.nodeDefs as NodeDef[]);

      const nowStr = new Date();
      await prisma.$executeRaw`
      INSERT INTO "Node" ("id", "name", "updatedAt", "eventType")
      VALUES ${Prisma.join(
        nodeDefs.map((nodeDef) => {
          return Prisma.sql`(${nodeDef.id}, ${nodeDef.name}, ${nowStr}, ${nodeDef.eventType})`;
        }),
        ","
      )}
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "updatedAt" = EXCLUDED."updatedAt",
        "eventType" = EXCLUDED."eventType"`;

      // Upsert new fns
      const fnDefs = nodeDefs.flatMap((nodeDef) => nodeDef.fn);
      const uniqueFnDefs = uniqBy(fnDefs, (fnDef) => fnDef.id);
      await prisma.$executeRaw`
        INSERT INTO "Fn" ("id", "name", "updatedAt", "type")
        VALUES ${Prisma.join(
          uniqueFnDefs.map((fnDef) => {
            return Prisma.sql`(${fnDef.id}, ${fnDef.name}, ${nowStr}, ${fnDef.type})`;
          }),
          ","
        )}
        ON CONFLICT ("id") DO UPDATE SET
          "name" = EXCLUDED."name",
          "updatedAt" = EXCLUDED."updatedAt"
      `;

      const mapFnIdToSnapshotId = new Map<string, string>();
      const mapNodeIdToSnapshotId = new Map<string, string>();

      uniqueFnDefs.forEach((fnDef) => {
        mapFnIdToSnapshotId.set(fnDef.id, generateNanoId());
      });
      nodeDefs.forEach((nodeDef) => {
        mapNodeIdToSnapshotId.set(nodeDef.id, generateNanoId());
      });

      await prisma.fnSnapshot.createMany({
        skipDuplicates: true,
        data: uniqueFnDefs.map((fnDef) => {
          const snapshotId = mapFnIdToSnapshotId.get(fnDef.id);
          assert(
            snapshotId,
            "Snapshot ID not found. This should never happen."
          );
          return {
            id: mapFnIdToSnapshotId.get(fnDef.id),
            fnId: fnDef.id,
            config: fnDef.config as any,
            returnSchema: fnDef.returnSchema as any,
          } satisfies Prisma.FnSnapshotCreateManyInput;
        }),
      });

      await prisma.nodeSnapshot.createMany({
        data: nodeDefs.map((nodeDef) => {
          const snapshotId = mapNodeIdToSnapshotId.get(nodeDef.id);
          assert(
            snapshotId,
            "Snapshot ID not found. This should never happen."
          );

          const fnSnapshotId = mapFnIdToSnapshotId.get(nodeDef.fn.id);
          assert(
            fnSnapshotId,
            "Snapshot ID not found. This should never happen."
          );
          return {
            id: snapshotId,
            nodeId: nodeDef.id,
            fnSnapshotId,
            inputs: nodeDef.inputs as any,
            dependsOn: Array.from(nodeDef.dependsOn),
          } satisfies Prisma.NodeSnapshotCreateManyInput;
        }),
      });

      // Create new engine
      const engine = await prisma.executionEngine.create({});

      await prisma.executionEngineToNodeSnapshot.createMany({
        data: nodeDefs.map((nodeDef) => {
          const snapshotId = mapNodeIdToSnapshotId.get(nodeDef.id);
          assert(
            snapshotId,
            "Snapshot ID not found. This should never happen."
          );
          return {
            executionEngineId: engine.id,
            nodeSnapshotId: snapshotId,
          } satisfies Prisma.ExecutionEngineToNodeSnapshotCreateManyInput;
        }),
      });

      return {
        engineId: engine.id,
      };
    }),
});

async function getEngineNodeDefs(engineId: string) {
  const result = await prisma.executionEngine.findFirst({
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

  const nodeSnapshots =
    result?.nodeSnapshots.map((snapshot) => snapshot.nodeSnapshot) ?? [];

  const nodeDefs = nodeSnapshots.map(prismaNodeSnapshotToNodeDef);

  return nodeDefs;
}

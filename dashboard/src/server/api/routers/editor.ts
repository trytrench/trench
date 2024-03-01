import { type NodeDef, nodeDefSchema } from "event-processing";
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { prismaNodeSnapshotToNodeDef } from "../../lib/prismaConverters";
import { checkErrors, prune } from "../../../shared/publish";
import { GlobalStateKey, Prisma } from "@prisma/client";
import { prisma } from "databases";
import { uniqBy } from "lodash";
import { assert, generateNanoId } from "../../../../../packages/common/src";

export const editorRouter = createTRPCRouter({
  getLatestEngine: publicProcedure.query(async ({ ctx }) => {
    const latestEngineId = await ctx.prisma.executionEngine.findFirstOrThrow({
      orderBy: { createdAt: "desc" },
    });
    return {
      id: latestEngineId.id,
      createdAt: latestEngineId.createdAt,
      nodeDefs: await getEngineNodeDefs(latestEngineId.id),
    };
  }),
  getEngine: publicProcedure
    .input(z.object({ engineId: z.string() }))
    .query(async ({ ctx, input }) => {
      const engineId = input.engineId;
      const engine = await ctx.prisma.executionEngine.findUniqueOrThrow({
        where: { id: engineId },
      });
      return {
        id: engine.id,
        createdAt: engine.createdAt,
        nodeDefs: await getEngineNodeDefs(engine.id),
      };
    }),
  saveNewEngine: protectedProcedure
    .input(z.object({ nodeDefs: z.array(nodeDefSchema) }))
    .mutation(async ({ input }) => {
      const errors = checkErrors(input.nodeDefs);
      Object.entries(errors).forEach(([nodeId, error]) => {
        const node = input.nodeDefs.find((def) => def.id === nodeId);
        throw new Error(
          `Cannot publish: Node "${
            node?.name ?? "<Unnamed>"
          }" has error: "${error}"`
        );
      });

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

      await prisma.globalState.update({
        where: {
          key: GlobalStateKey.ActiveEngineId,
        },
        data: {
          value: engine.id,
        },
      });

      return {
        engine: {
          id: engine.id,
          createdAt: engine.createdAt,
          nodeDefs: nodeDefs,
        },
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

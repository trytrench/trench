import { GlobalStateKey, prisma } from "databases";
import {
  FN_TYPE_REGISTRY,
  FnType,
  type NodeDef,
  bareNodeDefSchema,
  fnDefSchema,
} from "event-processing";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prismaToFnDef, prismaToNodeDef } from "../../lib/prismaConverters";
import { type Prisma } from "@prisma/client";
import { fnDefsRouter } from "./fnDefs";

const NODE_INCLUDE_ARGS = {
  snapshots: {
    include: { function: true },
    orderBy: { createdAt: "desc" },
    take: 1,
  },
} satisfies Prisma.NodeInclude;

export const nodeDefsRouter = createTRPCRouter({
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const nodeDef = await ctx.prisma.node.findUniqueOrThrow({
        where: { id: input.id },
        include: NODE_INCLUDE_ARGS,
      });
      return prismaToNodeDef(nodeDef);
    }),

  list: protectedProcedure
    .input(z.object({ eventType: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const nodes = await ctx.prisma.node.findMany({
        where: { eventType: input?.eventType },
        include: NODE_INCLUDE_ARGS,
      });
      return nodes.map(prismaToNodeDef);
    }),

  createWithFn: protectedProcedure
    .input(
      bareNodeDefSchema
        .omit({ id: true, dependsOn: true, snapshotId: true })
        .merge(z.object({ fn: fnDefSchema.omit({ id: true }) }))
    )
    .mutation(async ({ ctx, input }) => {
      const { fn } = input;
      const result = await ctx.prisma.function.create({
        data: {
          ...fn,
          returnSchema: fn.returnSchema as unknown as any,
        },
      });
      const createdFnDef = prismaToFnDef(result);

      // Validate inputs based on function
      const { getDependencies, inputSchema } =
        FN_TYPE_REGISTRY[createdFnDef.type];
      const dependsOn = getDependencies(input.inputs);
      inputSchema.parse(input.inputs);

      // Only publish engine if function is "important"
      const UNIMPORTANT_FN_TYPES = [FnType.GetEntityFeature];
      if (!UNIMPORTANT_FN_TYPES.includes(createdFnDef.type)) {
        await publish();
      }

      const newNodeDef = await ctx.prisma.node.create({
        data: {
          eventType: input.eventType,
          name: input.name,
          snapshots: {
            create: {
              dependsOn: Array.from(dependsOn),
              inputs: input.inputs as unknown as any,
              function: {
                connect: { id: createdFnDef.id },
              },
            },
          },
        },
        include: NODE_INCLUDE_ARGS,
      });

      return prismaToNodeDef(newNodeDef);
    }),

  create: protectedProcedure
    .input(
      bareNodeDefSchema
        .omit({ id: true, dependsOn: true, snapshotId: true })
        .merge(z.object({ fnId: z.string() }))
    )
    .mutation(async ({ ctx, input }) => {
      const _func = await ctx.prisma.function.findUniqueOrThrow({
        where: { id: input.fnId },
      });
      const fnDef = prismaToFnDef(_func);

      // Validate inputs based on function
      const { getDependencies, inputSchema } = FN_TYPE_REGISTRY[fnDef.type];
      const dependsOn = getDependencies(input.inputs);
      inputSchema.parse(input.inputs);

      // Only publish engine if function is "important"
      const UNIMPORTANT_FN_TYPES = [FnType.GetEntityFeature];
      if (!UNIMPORTANT_FN_TYPES.includes(fnDef.type)) {
        await publish();
      }

      const nodeDef = await ctx.prisma.node.create({
        data: {
          eventType: input.eventType,
          name: input.name,
          snapshots: {
            create: {
              dependsOn: Array.from(dependsOn),
              inputs: input.inputs as unknown as any,
              function: {
                connect: { id: fnDef.id },
              },
            },
          },
        },
        include: NODE_INCLUDE_ARGS,
      });

      return prismaToNodeDef(nodeDef);
    }),

  update: protectedProcedure
    .input(
      bareNodeDefSchema
        .omit({
          dependsOn: true,
          eventType: true,
          snapshotId: true,
        })
        .merge(
          z.object({
            fnId: z.string().optional(),
          })
        )
    )
    .mutation(async ({ ctx, input }) => {
      const _rawNode = await ctx.prisma.node.findUniqueOrThrow({
        where: { id: input.id },
        include: NODE_INCLUDE_ARGS,
      });
      const originalNodeDef = prismaToNodeDef(_rawNode);

      async function createNewSnapshotArgs(): Promise<Omit<
        Prisma.NodeSnapshotCreateInput,
        "node"
      > | null> {
        if (!input.inputs && !input.fnId) return null;
        if (input.fnId === originalNodeDef.fn.id) return null;

        const fnDef = input.fnId
          ? prismaToFnDef(
              await ctx.prisma.function.findUniqueOrThrow({
                where: { id: input.fnId },
              })
            )
          : originalNodeDef.fn;

        const { inputSchema, getDependencies } = FN_TYPE_REGISTRY[fnDef.type];
        inputSchema.parse(input.inputs);
        const dependsOn = getDependencies(input.inputs);

        return {
          dependsOn: Array.from(dependsOn),
          inputs: input.inputs as unknown as any,
          function: {
            connect: { id: fnDef.id },
          },
        };
      }

      const newSnapshotArgs = await createNewSnapshotArgs();

      const updatedNodeDef = await ctx.prisma.node.update({
        where: { id: input.id },
        data: {
          name: input.name,
          snapshots: newSnapshotArgs ? { create: newSnapshotArgs } : undefined,
        },
        include: NODE_INCLUDE_ARGS,
      });

      return prismaToNodeDef(updatedNodeDef);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.node.delete({
        where: { id: input.id },
      });
    }),
});

/// Publish engine

const publish = async () => {
  const nodeDefsRaw = await prisma.node.findMany({
    include: NODE_INCLUDE_ARGS,
  });

  const nodeDefs = nodeDefsRaw.map(prismaToNodeDef);

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
};

function prune(nodeDefs: NodeDef[]): NodeDef[] {
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

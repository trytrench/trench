import { GlobalStateKey, prisma } from "databases";
import {
  NODE_TYPE_REGISTRY,
  type NodeDef,
  type NodeDefsMap,
  NodeType,
  type TSchema,
  getNodeDefSchema,
} from "event-processing";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const nodeDefSchema = getNodeDefSchema(z.any());

export const nodeDefsRouter = createTRPCRouter({
  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const nodeDef = await ctx.prisma.node.findUniqueOrThrow({
        where: { id: input.id },
        include: { snapshots: { orderBy: { createdAt: "desc" }, take: 1 } },
      });

      const snapshot = nodeDef.snapshots[0]!;
      const ret: NodeDefsMap[keyof NodeDefsMap] = {
        id: nodeDef.id,
        snapshotId: snapshot.id,
        name: nodeDef.name,
        eventType: nodeDef.eventType,
        config: snapshot.config as unknown as any,
        type: nodeDef.type as unknown as any,
        dependsOn: new Set(snapshot.dependsOn),
        returnSchema: snapshot as unknown as TSchema,
      };
      return ret;
    }),

  list: protectedProcedure
    .input(
      z
        .object({
          eventType: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const nodes = await ctx.prisma.node.findMany({
        where: {
          eventType: input?.eventType,
        },
        include: { snapshots: { orderBy: { createdAt: "desc" }, take: 1 } },
      });

      const arr: NodeDefsMap[NodeType][] = nodes.map((nodeDef) => {
        const snapshot = nodeDef.snapshots[0]!;
        const ret: NodeDefsMap[NodeType] = {
          id: nodeDef.id,
          snapshotId: snapshot.id,
          name: nodeDef.name,
          eventType: nodeDef.eventType,
          config: snapshot.config as unknown as any,
          type: nodeDef.type as unknown as any,
          dependsOn: new Set(snapshot.dependsOn),
          returnSchema: snapshot.returnSchema as unknown as TSchema,
        };
        return ret;
      });
      return arr;
    }),

  create: protectedProcedure
    .input(nodeDefSchema.omit({ id: true, dependsOn: true, snapshotId: true }))
    .mutation(async ({ ctx, input }) => {
      const { configSchema, getDependencies } = NODE_TYPE_REGISTRY[input.type];
      configSchema.parse(input.config);
      const dependsOn = getDependencies(input.config);
      const nodeDef = await ctx.prisma.node.create({
        data: {
          name: input.name,
          type: input.type,
          eventType: input.eventType,
          snapshots: {
            create: {
              returnSchema: input.returnSchema as unknown as any,
              dependsOn: Array.from(dependsOn),
              config: input.config,
            },
          },
        },
        include: { snapshots: { orderBy: { createdAt: "desc" }, take: 1 } },
      });

      // If we create a LogEntityFeature node, we need to create a corresponding CacheEntityFeature node.
      // At compile time, we prune CacheEntityFeature nodes that don't have a corresponding GetEntityFeature node.
      if (input.type === NodeType.LogEntityFeature) {
        await ctx.prisma.node.create({
          data: {
            name: `Cache data logged in ${nodeDef.id}`,
            type: NodeType.CacheEntityFeature,
            eventType: input.eventType,
            snapshots: {
              create: {
                dependsOn: Array.from(dependsOn),
                config: input.config,
                returnSchema: input.returnSchema as unknown as any,
              },
            },
          },
        });
      }

      if (input.type !== NodeType.GetEntityFeature) {
        await publish();
      }

      const snapshot = nodeDef.snapshots[0]!;
      const ret: NodeDefsMap[keyof NodeDefsMap] = {
        id: nodeDef.id,
        snapshotId: snapshot.id,
        name: nodeDef.name,
        eventType: nodeDef.eventType,
        config: snapshot.config as unknown as any,
        type: nodeDef.type as unknown as any,
        dependsOn: new Set(snapshot.dependsOn),
        returnSchema: snapshot.returnSchema as unknown as TSchema,
      };
      return ret;
    }),

  update: protectedProcedure
    .input(
      nodeDefSchema.omit({
        dependsOn: true,
        returnSchema: true,
        eventType: true,
        snapshotId: true,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const nodeDef = await ctx.prisma.node.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          snapshots: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      });

      const { configSchema, getDependencies } =
        NODE_TYPE_REGISTRY[nodeDef.type as NodeType];
      configSchema.parse(input.config);
      const dependsOn = getDependencies(input.config);

      const snapshotKeys = ["config"];
      const shouldCreateSnapshot = Object.keys(input).some((key) =>
        snapshotKeys.includes(key)
      );

      const snapshot = nodeDef.snapshots[0]!;

      const updatedNodeDef = await ctx.prisma.node.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          snapshots: shouldCreateSnapshot
            ? {
                create: {
                  returnSchema: snapshot.returnSchema as unknown as any,
                  dependsOn: Array.from(dependsOn),
                  config: input.config,
                },
              }
            : undefined,
        },
        include: {
          snapshots: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      });

      const updatedSnapshot = updatedNodeDef.snapshots[0]!;
      const ret: NodeDefsMap[keyof NodeDefsMap] = {
        id: updatedNodeDef.id,
        snapshotId: snapshot.id,
        name: updatedNodeDef.name,
        eventType: updatedNodeDef.eventType,
        config: updatedSnapshot.config as unknown as any,
        type: updatedNodeDef.type as unknown as any,
        dependsOn: new Set(updatedSnapshot.dependsOn),
        returnSchema: updatedSnapshot.returnSchema as unknown as TSchema,
      };
      return ret;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.node.delete({
        where: { id: input.id },
      });
    }),
});

const publish = async () => {
  const nodeDefsRaw = await prisma.node.findMany({
    include: { snapshots: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  const nodeDefs: NodeDefsMap[NodeType][] = nodeDefsRaw.map((nodeDef) => {
    const snapshot = nodeDef.snapshots[0]!;
    const ret = {
      id: nodeDef.id,
      snapshotId: snapshot.id,
      name: nodeDef.name,
      eventType: nodeDef.eventType,
      config: snapshot.config as unknown as any,
      type: nodeDef.type as unknown as any,
      dependsOn: new Set(snapshot.dependsOn),
      returnSchema: snapshot.returnSchema as unknown as TSchema,
    };
    return ret;
  });

  const prunedNodeDefs = prune(nodeDefs);

  const engine = await prisma.executionEngine.create({
    data: {
      nodeSnapshots: {
        createMany: {
          data: prunedNodeDefs.map((nodeDef) => ({
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

function prune(_nodeDefs: NodeDef[]): NodeDef[] {
  const nodeDefs = _nodeDefs as NodeDefsMap[NodeType][];

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
    switch (def.type) {
      case NodeType.GetEntityFeature: {
        featureIdsToCache.add(def.config.featureId);
        return allDependsOn.has(def.id);
      }
      default:
        return true;
    }
  });

  return nodeDefs2.filter((def) => {
    switch (def.type) {
      case NodeType.CacheEntityFeature: {
        return featureIdsToCache.has(def.config.featureId);
      }
      default:
        return true;
    }
  });
}

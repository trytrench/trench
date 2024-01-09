import { GlobalStateKey } from "databases";
import {
  DataType,
  getNodeDefFromSnapshot,
  NODE_TYPE_DEFS,
  NodeType,
} from "event-processing";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const nodeDefsRouter = createTRPCRouter({
  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const node = await ctx.prisma.node.findUniqueOrThrow({
        where: {
          id: input.id,
        },
        include: {
          snapshots: {
            include: {
              node: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      });

      return getNodeDefFromSnapshot(node.snapshots[0]!);
    }),

  allInfo: protectedProcedure
    .input(
      z.object({
        featureType: z.nativeEnum(NodeType).optional(),
        dataType: z.nativeEnum(DataType).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const featureDefs = await ctx.prisma.node.findMany({
        where: {
          type: input.featureType,
          dataType: input.dataType,
        },
      });

      return featureDefs;
    }),

  getNodesForEventType: protectedProcedure
    .input(
      z.object({
        eventTypeId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const snapshots = await ctx.prisma.nodeSnapshot.findMany({
        distinct: ["nodeId"],
        where: {
          eventTypes: {
            has: input.eventTypeId,
          },
        },
        include: {
          node: true,
        },
      });

      return snapshots;
    }),

  getLatest: protectedProcedure.query(async ({ ctx, input }) => {
    const snapshots = await ctx.prisma.nodeSnapshot.findMany({
      distinct: ["nodeId"],
      include: {
        node: true,
      },
    });

    const featureDefs = snapshots.map((snapshot) => {
      return getNodeDefFromSnapshot({ featureDefSnapshot: snapshot });
    });

    return featureDefs;
  }),

  list: protectedProcedure.query(async ({ ctx, input }) => {
    const featureDefs = await ctx.prisma.node.findMany({
      include: {
        snapshots: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    return featureDefs.map((featureDef) => {
      if (!featureDef.snapshots[0]) {
        throw new Error("Feature has no snapshots");
      }

      const latestSnapshot = featureDef.snapshots[0];

      return {
        ...({
          featureId: featureDef.id,
          featureName: featureDef.name,
          dependsOn: new Set(latestSnapshot.deps),
          featureType: featureDef.type,
          eventTypes: new Set(latestSnapshot.eventTypes),
          dataType: featureDef.dataType,
          config: featureDef.snapshots[0].config,
        } as FeatureDef),

        updatedAt: featureDef.snapshots[0].createdAt,
        createdAt: featureDef.createdAt,
      };
    });
  }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),

        eventTypes: z.array(z.string()),
        deps: z.array(z.string()),

        config: z.record(z.any()),
        type: z.nativeEnum(NodeType),
        // dataType: z.nativeEnum(DataType),
        dataType: z.record(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const featureTypeZod = NODE_TYPE_DEFS[input.type].configSchema;
      featureTypeZod.parse(input.config);

      // TODO: Need to validate data type here

      const allowedDataTypes: DataType[] =
        NODE_TYPE_DEFS[input.type].allowedDataTypes;
      if (!allowedDataTypes.includes(input.dataType.type)) {
        throw new Error(
          `Feature type ${input.type} does not support data type ${input.dataType.type}`
        );
      }

      const featureDef = await ctx.prisma.node.create({
        data: {
          type: input.type,
          dataType: input.dataType,
          name: input.name,
          snapshots: {
            create: [
              {
                eventTypes: input.eventTypes,
                deps: input.deps,
                config: input.config,
              },
            ],
          },
        },
      });

      // Publish
      const latestFeatureSnapshots = await ctx.prisma.node.findMany({
        include: {
          snapshots: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      });

      const engine = await ctx.prisma.executionEngine.create({
        data: {
          nodeSnapshots: {
            createMany: {
              data: latestFeatureSnapshots.map((featureDef) => ({
                nodeSnapshotId: featureDef.snapshots[0]!.id,
              })),
            },
          },
        },
      });

      await ctx.prisma.globalState.upsert({
        where: {
          key: GlobalStateKey.ActiveEngineId,
        },
        create: {
          key: GlobalStateKey.ActiveEngineId,
          value: engine.id,
        },
        update: {
          value: engine.id,
        },
      });

      return featureDef;
    }),

  save: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        deps: z.array(z.string()),
        eventTypes: z.array(z.string()),
        config: z.record(z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.node.update({
        where: {
          id: input.id,
        },
        data: {
          snapshots: {
            create: [
              {
                deps: input.deps,
                config: input.config,
                eventTypes: input.eventTypes,
              },
            ],
          },
        },
      });
    }),

  rename: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.node.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
        },
      });
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.node.delete({
        where: {
          id: input.id,
        },
      });
    }),
});

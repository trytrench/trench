import { GlobalStateKey } from "databases";
import {
  DataType,
  FEATURE_TYPE_DEFS,
  FeatureType,
  type FeatureDef,
} from "event-processing";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const featureDefsRouter = createTRPCRouter({
  getLatest: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const featureDef = await ctx.prisma.featureDef.findUnique({
        where: {
          id: input.id,
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

      if (!featureDef) {
        throw new Error("Feature not found");
      }

      if (!featureDef.snapshots[0]) {
        throw new Error("Feature has no snapshots");
      }

      const latestSnapshot = featureDef.snapshots[0];

      return {
        featureDef: {
          featureId: featureDef.id,
          featureType: featureDef.type,
          name: featureDef.name,
          dependsOn: new Set(latestSnapshot.deps),
          dataType: featureDef.dataType,
          config: JSON.parse(featureDef.snapshots[0].config as string),
        } as FeatureDef,

        updatedAt: featureDef.snapshots[0].createdAt,
        createdAt: featureDef.createdAt,
      };
    }),

  allInfo: protectedProcedure.query(async ({ ctx, input }) => {
    const featureDefs = await ctx.prisma.featureDef.findMany({});

    return featureDefs;
  }),

  getVersions: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const featureDef = await ctx.prisma.featureDef.findUnique({
        where: {
          id: input.id,
        },
        include: {
          snapshots: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      if (!featureDef) {
        throw new Error("Feature not found");
      }

      return {
        ...featureDef,
        snapshots: featureDef.snapshots.map((snapshot) => ({
          ...snapshot,
          config: JSON.parse(snapshot.config as string),
        })),
      };
    }),

  list: protectedProcedure.query(async ({ ctx, input }) => {
    const featureDefs = await ctx.prisma.featureDef.findMany({
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
          name: featureDef.name,
          dependsOn: new Set(latestSnapshot.deps),
          featureType: featureDef.type,
          dataType: featureDef.dataType,
          config: JSON.parse(featureDef.snapshots[0].config as string),
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
        featureType: z.nativeEnum(FeatureType),
        dataType: z.nativeEnum(DataType),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const featureTypeZod = FEATURE_TYPE_DEFS[input.featureType].configSchema;
      featureTypeZod.parse(input.config);

      const featureDef = await ctx.prisma.featureDef.create({
        data: {
          type: input.featureType,
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
      const latestFeatureSnapshots = await ctx.prisma.featureDef.findMany({
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
          featureDefSnapshots: {
            createMany: {
              data: latestFeatureSnapshots.map((featureDef) => ({
                featureDefSnapshotId: featureDef.snapshots[0]!.id,
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
        config: z.record(z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.featureDef.update({
        where: {
          id: input.id,
        },
        data: {
          snapshots: {
            create: [
              {
                deps: input.deps,
                config: input.config,
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
      return ctx.prisma.featureDef.update({
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
      return ctx.prisma.featureDef.delete({
        where: {
          id: input.id,
        },
      });
    }),
});

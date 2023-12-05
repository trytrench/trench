import { GlobalStateKey } from "databases";
import {
  DataType,
  FEATURE_TYPE_DEFS,
  FeatureType,
  getFeatureDefFromSnapshot,
  type FeatureDef,
} from "event-processing";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const featureDefsRouter = createTRPCRouter({
  allInfo: protectedProcedure
    .input(
      z.object({
        featureType: z.nativeEnum(FeatureType).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const featureDefs = await ctx.prisma.featureDef.findMany({
        where: {
          type: input.featureType,
        },
      });

      return featureDefs;
    }),

  getLatest: protectedProcedure.query(async ({ ctx, input }) => {
    const snapshots = await ctx.prisma.featureDefSnapshot.findMany({
      distinct: ["featureDefId"],
      include: {
        featureDef: true,
      },
    });

    const featureDefs = snapshots.map((snapshot) => {
      return getFeatureDefFromSnapshot({ featureDefSnapshot: snapshot });
    });

    return featureDefs;
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
        eventTypes: z.array(z.string()),
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

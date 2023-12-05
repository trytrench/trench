import { GlobalStateKey } from "databases";
import {
  DataType,
  FEATURE_TYPE_DEFS,
  FeatureType,
  getFeatureDefFromSnapshot,
  type FeatureDef,
} from "event-processing";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const featureDefsRouter = createTRPCRouter({
  allInfo: publicProcedure.query(async ({ ctx, input }) => {
    const featureDefs = await ctx.prisma.featureDef.findMany({});

    return featureDefs;
  }),

  getLatest: publicProcedure.query(async ({ ctx, input }) => {
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

  list: publicProcedure.query(async ({ ctx, input }) => {
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
  create: publicProcedure
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

  save: publicProcedure
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

  rename: publicProcedure
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

  delete: publicProcedure
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

import { z } from "zod";
import { FeatureDef } from "~/lib/create-feature/types";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const featureDefsRouter = createTRPCRouter({
  getLatest: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const featureDef = await ctx.prisma.featureDef.findUnique({
        where: {
          projectId: input.projectId,
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
          id: featureDef.id,
          name: featureDef.name,
          deps: latestSnapshot.deps,
          type: featureDef.type,
          dataType: featureDef.dataType,
          config: JSON.parse(featureDef.snapshots[0].config as string),
        } as FeatureDef,

        updatedAt: featureDef.snapshots[0].createdAt,
        createdAt: featureDef.createdAt,
      };
    }),

  getVersions: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const featureDef = await ctx.prisma.featureDef.findUnique({
        where: {
          projectId: input.projectId,
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

  list: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const featureDefs = await ctx.prisma.featureDef.findMany({
        where: { projectId: input.projectId },
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
            id: featureDef.id,
            name: featureDef.name,
            deps: latestSnapshot.deps,
            type: featureDef.type,
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
        projectId: z.string(),
        name: z.string(),
        type: z.string(),
        dataType: z.string(),
        deps: z.array(z.string()),
        config: z.record(z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const configJSON = JSON.stringify(input.config);

      return ctx.prisma.featureDef.create({
        data: {
          projectId: input.projectId,
          type: input.type,
          dataType: input.dataType,
          name: input.name,
          snapshots: {
            create: [
              {
                projectId: input.projectId,
                deps: input.deps,
                config: configJSON,
              },
            ],
          },
        },
      });
    }),

  save: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        id: z.string(),
        deps: z.array(z.string()),
        config: z.record(z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const configJSON = JSON.stringify(input.config);

      return ctx.prisma.featureDef.update({
        where: {
          projectId: input.projectId,
          id: input.id,
        },
        data: {
          snapshots: {
            create: [
              {
                projectId: input.projectId,
                deps: input.deps,
                config: configJSON,
              },
            ],
          },
        },
      });
    }),

  rename: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        id: z.string(),
        name: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.featureDef.update({
        where: {
          projectId: input.projectId,
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
        projectId: z.string(),
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.featureDef.delete({
        where: {
          projectId: input.projectId,
          id: input.id,
        },
      });
    }),
});

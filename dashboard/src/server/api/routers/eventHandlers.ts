import {
  compileSqrl,
  createSqrlInstance,
  hashEventHandler,
} from "sqrl-helpers";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const eventHandlersRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { projectId } = input;
      return ctx.prisma.eventHandler.findMany({
        include: {
          assignments: {
            include: {
              dataset: true,
            },
          },
        },
        where: {
          projectId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }),
  listByReleases: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { projectId } = input;
      const project = await ctx.prisma.project.findUnique({
        where: {
          id: projectId,
        },
        include: {
          productionDataset: {
            include: {
              eventHandlerAssignments: {
                include: {
                  eventHandler: true,
                },
                orderBy: {
                  createdAt: "desc",
                },
              },
            },
          },
        },
      });

      const assignments = project?.productionDataset?.eventHandlerAssignments;
      if (!assignments) {
        throw new Error("No event handler assignments found");
      }

      return assignments.map((assignment) => ({
        releaseId: assignment.id,
        releasedAt: assignment.createdAt,
        eventHandler: assignment.eventHandler,
      }));
    }),
  listForMenubar: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { projectId } = input;

      const recents = await ctx.prisma.eventHandler.findMany({
        orderBy: {
          createdAt: "desc",
        },
        where: {
          projectId,
        },
        take: 5,
      });

      const productionProject = await ctx.prisma.project.findUnique({
        where: {
          id: projectId,
        },
        include: {
          productionDataset: {
            include: {
              currentEventHandlerAssignment: {
                include: {
                  eventHandler: true,
                },
              },
            },
          },
        },
      });

      return {
        recentEventHandlers: recents,
        productionEventHandler:
          productionProject?.productionDataset?.currentEventHandlerAssignment
            ?.eventHandler ?? null,
      };
    }),
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.eventHandler.findUnique({
        where: { id: input.id },
      });
    }),
  create: publicProcedure
    .input(
      z.object({
        message: z.string(),
        code: z.record(z.string()),
        projectId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { message, projectId, code } = input;

      const hash = hashEventHandler({ code });

      const release = await ctx.prisma.eventHandler.create({
        data: {
          message,
          code,
          hash,
          projectId: projectId,
        },
      });

      return release;
    }),
  // publish: publicProcedure
  //   .input(
  //     z.object({
  //       description: z.string().optional(),
  //       version: z.string(),
  //       code: z.record(z.string()),
  //       projectId: z.string(),
  //     })
  //   )
  //   .mutation(async ({ ctx, input }) => {
  //     const { description, version, code } = input;

  //     const instance = await createSqrlInstance({
  //       config: { "state.allow-in-memory": true },
  //     });

  //     const { compiled } = await compileSqrl(instance, code);

  //     const features = Object.keys(compiled.getFeatureDocs()).filter(
  //       (feature) =>
  //         !feature.startsWith("Sqrl") &&
  //         !Object.keys(compiled.getRuleSpecs()).includes(feature)
  //     );

  //     const release = await ctx.prisma.eventHandler.create({
  //       data: {
  //         description,
  //         version,
  //         code,
  //         projectId: input.projectId,
  //         // featureOrder: features,
  //       },
  //     });

  //     await ctx.prisma.featureMetadata.createMany({
  //       data: Object.keys(compiled.getRuleSpecs()).map((feature) => ({
  //         feature,
  //         releaseId: release.id,
  //         isRule: true,
  //         dataType: "boolean",
  //       })),
  //     });

  //     await ctx.prisma.featureMetadata.createMany({
  //       data: features.map((feature) => ({
  //         feature,
  //         releaseId: release.id,
  //         dataType: "text",
  //         isRule: false,
  //       })),
  //     });

  //     const project = await ctx.prisma.project.findUniqueOrThrow({
  //       where: { id: input.projectId },
  //     });

  //     await ctx.prisma.dataset.update({
  //       where: { id: project.prodDatasetId! },
  //       data: { releaseId: release.id },
  //     });

  //     return release;
  //   }),
});

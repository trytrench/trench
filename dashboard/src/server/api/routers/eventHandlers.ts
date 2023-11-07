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
  publish: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        eventHandlerId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { projectId, eventHandlerId } = input;

      const eventHandler = await ctx.prisma.eventHandler.findUniqueOrThrow({
        where: {
          id: eventHandlerId,
        },
      });

      const instance = await createSqrlInstance({
        config: { "state.allow-in-memory": true },
      });

      const { compiled } = await compileSqrl(
        instance,
        eventHandler.code as Record<string, string>
      );

      const features = Object.keys(compiled.getFeatureDocs()).filter(
        (feature) =>
          !feature.startsWith("Sqrl") &&
          !Object.keys(compiled.getRuleSpecs()).includes(feature)
      );

      // TODO: Upsert feature metadata

      const project = await ctx.prisma.project.findUniqueOrThrow({
        where: { id: input.projectId },
      });
      const prodDatasetId = project.productionDatasetId;
      if (!prodDatasetId) {
        throw new Error("No production dataset found");
      }

      await ctx.prisma.$transaction(async (tx) => {
        const assignment = await tx.eventHandlerAssignment.create({
          data: {
            eventHandlerId,
            datasetId: prodDatasetId,
          },
        });
        await tx.dataset.update({
          where: { id: prodDatasetId },
          data: { currentEventHandlerAssignmentId: assignment.id },
        });
      });

      return true;
    }),
});

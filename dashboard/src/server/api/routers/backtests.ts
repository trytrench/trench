import { DatasetType } from "databases";
import { hashEventHandler } from "sqrl-helpers";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const backtestsRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.dataset.findMany({
        where: { projectId: input.projectId, type: "BACKTEST" },
        include: {
          lastEventLog: true,
          currentEventHandlerAssignment: {
            include: {
              eventHandler: true,
            },
          },
        },
      });
    }),
  get: publicProcedure
    .input(z.object({ id: z.bigint() }))
    .query(async ({ ctx, input }) => {
      const data = await ctx.prisma.dataset.findUnique({
        where: { id: input.id },
        include: {
          lastEventLog: true,
          currentEventHandlerAssignment: {
            include: {
              eventHandler: true,
            },
          },
        },
      });

      if (!data) {
        throw new Error("Dataset not found");
      }

      const eventHandler = data.currentEventHandlerAssignment?.eventHandler;

      return {
        createdAt: data.createdAt,
        message: eventHandler?.description,
        from: data.startTime,
        to: data.endTime,
        eventHandler: eventHandler
          ? {
              code: eventHandler.code,
              hash: eventHandler.hash,
            }
          : undefined,
      };
    }),
  create: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        from: z.date(),
        to: z.date(),
        eventHandlerId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { projectId, eventHandlerId } = input;

      await ctx.prisma.$transaction(async (tx) => {
        const dataset = await tx.dataset.create({
          data: {
            startTime: input.from,
            endTime: input.to,
            name: "",
            type: "BACKTEST",
            projectId: projectId,
            eventHandlerAssignments: {
              create: {
                eventHandlerId: eventHandlerId,
              },
            },
          },
          include: {
            eventHandlerAssignments: true,
          },
        });

        await tx.dataset.update({
          where: { id: dataset.id },
          data: {
            currentEventHandlerAssignmentId:
              dataset.eventHandlerAssignments[0]!.id,
          },
        });
      });
    }),
});

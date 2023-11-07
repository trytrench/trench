import { DatasetType } from "databases";
import { hashEventHandler } from "sqrl-helpers";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const backtestsRouter = createTRPCRouter({
  listIds: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { projectId } = input;
      const datasets = await ctx.prisma.dataset.findMany({
        where: {
          projectId,
          type: "BACKTEST",
        },
        select: {
          id: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return datasets.map((dataset) => dataset.id);
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

      const lastEventProcessedTime =
        data.lastEventLog?.timestamp ?? data.startTime;

      const numEventsProcessed = await ctx.prisma.eventLog.count({
        where: {
          timestamp: {
            gte: data.startTime ?? undefined,
            lte: lastEventProcessedTime ?? undefined,
          },
        },
      });

      const totalEvents = await ctx.prisma.eventLog.count({
        where: {
          timestamp: {
            gte: data.startTime ?? undefined,
            lte: data.endTime ?? undefined,
          },
        },
      });

      const eventHandler = data.currentEventHandlerAssignment?.eventHandler;

      return {
        createdAt: data.createdAt,
        startTime: data.startTime,
        endTime: data.endTime,
        processedEvents: numEventsProcessed,
        totalEvents,
        isActive: data.isActive,
        eventHandler: eventHandler,
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

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const listsRouter = createTRPCRouter({
  getAllEventTypes: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.eventType.findMany();
  }),

  // prob doesnt work
  getFeatureColumnsForEventType: publicProcedure
    .input(
      z.object({
        eventType: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const vals = await ctx.prisma.eventFeature.findMany({
        where: {
          eventType: input.eventType,
        },
      });
      return vals;
    }),

  getEventsOfType: publicProcedure
    .input(
      z.object({
        eventTypeId: z.string(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [count, rows] = await Promise.all([
        ctx.prisma.event.count({
          where: {
            eventType: {
              id: input.eventTypeId,
            },
          },
        }),
        ctx.prisma.event.findMany({
          where: {
            eventType: {
              id: input.eventTypeId,
            },
          },
          include: {
            eventLabels: true,
            eventType: true,
          },
          orderBy: {
            timestamp: "desc",
          },
          take: input.limit,
          skip: input.offset,
        }),
      ]);
      return {
        count,
        rows,
      };
    }),

  // getAllLabels: publicProcedure.query(async ({ ctx, input }) => {
  //   const [eventLabels, entityLabels] = await ctx.prisma.$transaction([
  //     ctx.prisma.eventLabel.findMany(),
  //     ctx.prisma.entityLabel.findMany(),
  //   ]);
  //   return {
  //     eventLabels,
  //     entityLabels,
  //   };
  // }),
  // getEventLabels: publicProcedure.query(async ({ ctx }) => {
  //   return ctx.prisma.eventLabel.findMany();
  // }),
  // getEntityLabels: publicProcedure.query(async ({ ctx }) => {
  //   return ctx.prisma.entityLabel.findMany();
  // }),
  // getEventTypes: publicProcedure.query(async ({ ctx }) => {
  //   return ctx.prisma.eventType.findMany();
  // }),
  // getEntityTypes: publicProcedure.query(async ({ ctx }) => {
  //   return ctx.prisma.entityType.findMany();
  // }),
  // getLinkTypes: publicProcedure.query(async ({ ctx }) => {
  //   return ctx.prisma.linkType.findMany();
  // }),
});

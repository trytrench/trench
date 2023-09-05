import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const labelsRouter = createTRPCRouter({
  getAllLabels: publicProcedure.query(async ({ ctx, input }) => {
    const [eventLabels, entityLabels] = await ctx.prisma.$transaction([
      ctx.prisma.eventLabel.findMany(),
      ctx.prisma.entityLabel.findMany(),
    ]);

    return {
      eventLabels,
      entityLabels,
    };
  }),
  getEventLabels: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.eventLabel.findMany();
  }),
  getEntityLabels: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.entityLabel.findMany();
  }),
  getEventTypes: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.eventType.findMany();
  }),
  getEntityTypes: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.entityType.findMany();
  }),
  getLinkTypes: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.linkType.findMany();
  }),
});

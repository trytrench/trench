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
  getEventLabels: publicProcedure
    .input(
      z
        .object({
          eventType: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const eventType = input?.eventType;

      return ctx.prisma.eventLabel.findMany({
        where: {
          eventType,
        },
      });
    }),
  getEntityLabels: publicProcedure
    .input(
      z
        .object({
          entityType: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const entityType = input?.entityType;

      return ctx.prisma.entityLabel.findMany({
        where: {
          entityType,
        },
      });
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
  getEntityFeatures: publicProcedure
    .input(z.object({ entityType: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.entityFeature.findMany({
        where: {
          entityType: input.entityType,
        },
      });
    }),
});

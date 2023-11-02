import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const labelsRouter = createTRPCRouter({
  getEventTypes: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.eventType.findMany({
        where: {
          projectId: input.projectId,
        },
      });
    }),
  getEntityTypes: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.entityType.findMany({
        where: {
          projectId: input.projectId,
        },
      });
    }),
  getFeatures: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.feature.findMany({
        where: {
          projectId: input.projectId,
        },
      });
    }),
  getEventFeatures: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.eventFeature.findMany({
        where: { feature: { projectId: input.projectId } },
        include: {
          eventType: true,
          feature: true,
        },
      });
    }),
  getEntityFeatures: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.entityFeature.findMany({
        where: { feature: { projectId: input.projectId } },
        include: {
          entityType: true,
          feature: true,
        },
      });
    }),
});

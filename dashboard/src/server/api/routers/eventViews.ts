import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { EventViewConfig, eventViewConfig } from "~/shared/validation";

export const eventViewsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx, input }) => {
    const views = await ctx.prisma.eventView.findMany();
    return views.map((view) => ({
      ...view,
      config: view.config as unknown as EventViewConfig,
    }));
  }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        config: eventViewConfig,
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.eventView.create({
        data: {
          name: input.name,
          config: input.config,
        },
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        config: eventViewConfig.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.eventView.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          config: input.config,
        },
      });
    }),
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.eventView.delete({
        where: {
          id: input.id,
        },
      });
    }),
});

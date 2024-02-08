import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const entityViewsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx, input }) => {
    return ctx.prisma.entityView.findMany();
  }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        config: z.record(z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.entityView.create({
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
      return await ctx.prisma.entityType.delete({
        where: {
          id: input.id,
        },
      });
    }),
});

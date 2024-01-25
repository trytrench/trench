import { TypeName } from "event-processing";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const entityViewsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx, input }) => {
    return ctx.prisma.entityViews.findMany();
  }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        filters: z.record(z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.entityViews.create({
        data: {
          name: input.name,
          filters: input.filters,
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

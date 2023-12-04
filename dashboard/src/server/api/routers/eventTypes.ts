import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const eventTypesRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.eventType.create({
        data: {
          type: input.name,
        },
      });
    }),
  delete: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.eventType.delete({
        where: {
          id: input.id,
        },
      });
    }),
  list: publicProcedure.query(async ({ ctx, input }) => {
    return ctx.prisma.eventType.findMany({});
  }),
});

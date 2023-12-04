import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const entityTypesRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.entityType.create({
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
      return await ctx.prisma.entityType.delete({
        where: {
          id: input.id,
        },
      });
    }),
  list: publicProcedure.query(async ({ ctx, input }) => {
    return ctx.prisma.entityType.findMany({});
  }),
});

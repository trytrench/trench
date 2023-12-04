import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const entityTypesRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        projectId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.entityType.create({
        data: {
          type: input.name,
          projectId: input.projectId,
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
  list: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.entityType.findMany({
        where: {
          projectId: input.projectId,
        },
      });
    }),
});

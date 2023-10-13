import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const releasesRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.release.findMany({
      include: {
        datasets: true,
      },
    });
  }),
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.release.findUnique({
        where: { id: input.id },
      });
    }),
  create: publicProcedure
    .input(
      z.object({
        description: z.string().optional(),
        version: z.string(),
        code: z.record(z.string()),
        projectId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { description, version, code } = input;

      const release = await ctx.prisma.release.create({
        data: {
          description,
          version,
          code,
          projectId: input.projectId,
        },
      });

      return release;
    }),
});

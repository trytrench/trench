import { compileSqrl, createSqrlInstance } from "sqrl-helpers";
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
  publish: publicProcedure
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

      const instance = await createSqrlInstance({
        config: { "state.allow-in-memory": true },
      });

      const { compiled } = await compileSqrl(instance, code);

      const release = await ctx.prisma.release.create({
        data: {
          description,
          version,
          code,
          projectId: input.projectId,
        },
      });

      await ctx.prisma.featureMetadata.createMany({
        data: Object.keys(compiled.getRuleSpecs()).map((ruleName) => ({
          feature: ruleName,
          releaseId: release.id,
          isRule: true,
        })),
      });

      const project = await ctx.prisma.project.findUniqueOrThrow({
        where: { id: input.projectId },
      });

      await ctx.prisma.dataset.update({
        where: { id: project.prodDatasetId! },
        data: { releaseId: release.id },
      });

      return release;
    }),
});

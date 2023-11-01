import { compileSqrl, createSqrlInstance } from "sqrl-helpers";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const eventHandlersRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.eventHandler.findMany({
      include: {
        assignments: {
          include: {
            dataset: true,
          },
        },
      },
    });
  }),
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.eventHandler.findUnique({
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

      const release = await ctx.prisma.eventHandler.create({
        data: {
          description,
          version,
          code,
          projectId: input.projectId,
        },
      });

      return release;
    }),
  // publish: publicProcedure
  //   .input(
  //     z.object({
  //       description: z.string().optional(),
  //       version: z.string(),
  //       code: z.record(z.string()),
  //       projectId: z.string(),
  //     })
  //   )
  //   .mutation(async ({ ctx, input }) => {
  //     const { description, version, code } = input;

  //     const instance = await createSqrlInstance({
  //       config: { "state.allow-in-memory": true },
  //     });

  //     const { compiled } = await compileSqrl(instance, code);

  //     const features = Object.keys(compiled.getFeatureDocs()).filter(
  //       (feature) =>
  //         !feature.startsWith("Sqrl") &&
  //         !Object.keys(compiled.getRuleSpecs()).includes(feature)
  //     );

  //     const release = await ctx.prisma.eventHandler.create({
  //       data: {
  //         description,
  //         version,
  //         code,
  //         projectId: input.projectId,
  //         // featureOrder: features,
  //       },
  //     });

  //     await ctx.prisma.featureMetadata.createMany({
  //       data: Object.keys(compiled.getRuleSpecs()).map((feature) => ({
  //         feature,
  //         releaseId: release.id,
  //         isRule: true,
  //         dataType: "boolean",
  //       })),
  //     });

  //     await ctx.prisma.featureMetadata.createMany({
  //       data: features.map((feature) => ({
  //         feature,
  //         releaseId: release.id,
  //         dataType: "text",
  //         isRule: false,
  //       })),
  //     });

  //     const project = await ctx.prisma.project.findUniqueOrThrow({
  //       where: { id: input.projectId },
  //     });

  //     await ctx.prisma.dataset.update({
  //       where: { id: project.prodDatasetId! },
  //       data: { releaseId: release.id },
  //     });

  //     return release;
  //   }),
});

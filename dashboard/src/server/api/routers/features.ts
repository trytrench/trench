import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const featuresRouter = createTRPCRouter({
  getFeatureMetadata: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.featureMetadata.findMany();
  }),
  saveFeatureMetadata: publicProcedure
    .input(
      z.object({
        feature: z.string(),
        name: z.string().optional(),
        dataType: z.enum(["text", "number", "boolean", "json"]),
        datasetId: z.bigint(),
        hidden: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const feature = await ctx.prisma.featureMetadata.upsert({
        where: {
          feature: input.feature,
        },
        create: {
          feature: input.feature,
          datasetId: input.datasetId,
          name: input.name,
          dataType: input.dataType,
          isRule: false,
        },
        update: {
          name: input.name,
          dataType: input.dataType,
          hidden: input.hidden,
        },
      });
      return feature;
    }),

  saveFeatureOrder: publicProcedure
    .input(
      z.object({
        features: z.string().array(),
        datasetId: z.bigint(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const release = await ctx.prisma.dataset.update({
        where: { id: input.datasetId },
        data: {
          featureOrder: input.features,
        },
      });
      return release;
    }),
});

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
        releaseId: z.string(),
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
          releaseId: input.releaseId,
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
});

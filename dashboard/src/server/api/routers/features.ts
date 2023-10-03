import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const featuresRouter = createTRPCRouter({
  getFeatureMetadata: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.featureMetadata.findMany();
  }),
  saveFeatureMetadata: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        dataType: z.enum(["text", "number", "boolean", "json"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const feature = await ctx.prisma.featureMetadata.upsert({
        where: {
          id: input.id,
        },
        create: {
          id: input.id,
          name: input.name,
          dataType: input.dataType,
        },
        update: {
          name: input.name,
          dataType: input.dataType,
        },
      });
      return feature;
    }),
});

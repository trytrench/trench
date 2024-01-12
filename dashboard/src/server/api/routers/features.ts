import { FeatureDef, TSchema } from "event-processing";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const featureDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  schema: z.record(z.unknown()),
  entityTypeId: z.string(),
});

export const featuresRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const features = await ctx.prisma.feature.findMany({});

    return features.map((feature) => {
      return {
        id: feature.id,
        name: feature.name,
        description: feature.description ?? undefined,
        schema: feature.schema as unknown as TSchema,
        entityTypeId: feature.entityTypeId,
      };
    }) as FeatureDef[];
  }),
  create: protectedProcedure
    .input(featureDefSchema.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const feature = await ctx.prisma.feature.create({
        data: {
          name: input.name,
          schema: input.schema,
          entityTypeId: input.entityTypeId,
        },
      });

      return feature;
    }),
  //   delete: protectedProcedure
  //     .input(z.object({ id: z.string() }))
  //     .mutation(async ({ ctx, input }) => {
  //       await ctx.prisma.listItem.deleteMany({
  //         where: {
  //           listId: input.id,
  //         },
  //       });

  //       return ctx.prisma.list.delete({
  //         where: {
  //           id: input.id,
  //         },
  //       });
  //     }),
  //   get: protectedProcedure
  //     .input(
  //       z.object({
  //         id: z.string(),
  //       })
  //     )
  //     .query(async ({ ctx, input }) => {
  //       return ctx.prisma.list.findUnique({
  //         where: {
  //           id: input.id,
  //         },
  //         include: {
  //           items: true,
  //         },
  //       });
  //     }),
});

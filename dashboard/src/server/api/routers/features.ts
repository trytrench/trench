import { DataType } from "event-processing";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const featuresRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.feature.findMany({
      include: {
        belongsTo: true,
      },
    });
  }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        dataType: z.record(z.string()),
        entityTypeId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const feature = await ctx.prisma.feature.create({
        data: {
          name: input.name,
          dataType: input.dataType,
        },
      });

      await ctx.prisma.featureToEntityType.create({
        data: {
          featureId: feature.id,
          entityTypeId: input.entityTypeId,
          orderIndex: 0,
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

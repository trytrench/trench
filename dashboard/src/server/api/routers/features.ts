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
  list: protectedProcedure
    .input(
      z
        .object({
          entityTypeId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const result = await ctx.prisma.feature.findMany({
        where: {
          entityTypeId: input?.entityTypeId ?? undefined,
        },
      });

      const ret: FeatureDef[] = result.map((f) => {
        return {
          id: f.id,
          name: f.name,
          description: f.description ?? undefined,
          schema: f.schema as unknown as TSchema,
          entityTypeId: f.entityTypeId,
        };
      });

      return ret;
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

import { TypeName } from "event-processing";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const entityTypesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const entityType = await ctx.prisma.entityType.create({
        data: {
          type: input.name,
        },
      });

      await ctx.prisma.feature.create({
        data: {
          name: "Name",
          entityTypeId: entityType.id,
          schema: { type: TypeName.Name },
        },
      });

      return entityType;
    }),
  delete: protectedProcedure
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
  list: protectedProcedure.query(async ({ ctx, input }) => {
    return await ctx.prisma.entityType.findMany({});
  }),
  upsertPage: protectedProcedure
    .input(
      z.object({
        config: z.any(),
        entityTypeId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.entityTypePage.findFirst({
        where: {
          entityTypeId: input.entityTypeId,
        },
      });

      // We don't use Prisma upsert because entityTypeId is not a unique key. This leaves
      // room for multiple pages per entity type in the future.
      if (existing) {
        return await ctx.prisma.entityTypePage.update({
          where: {
            id: existing.id,
          },
          data: {
            config: input.config,
          },
        });
      } else {
        return await ctx.prisma.entityTypePage.create({
          data: {
            entityTypeId: input.entityTypeId,
            config: input.config,
          },
        });
      }
    }),
  getPage: protectedProcedure
    .input(
      z.object({
        entityTypeId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.entityTypePage.findFirst({
        where: {
          entityTypeId: input.entityTypeId,
        },
      });
    }),
});

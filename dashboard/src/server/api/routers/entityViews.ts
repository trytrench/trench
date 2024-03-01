import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  type EntityViewConfig,
  entityViewConfigZod,
} from "~/shared/validation";

export const entityViewsRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        entityTypeId: z.string().nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      const views = await ctx.prisma.entityView.findMany({
        where: {
          entityTypeId: input.entityTypeId,
        },
      });
      return views.map((view) => ({
        ...view,
        config: view.config as unknown as EntityViewConfig,
      }));
    }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        config: entityViewConfigZod,
        entityTypeId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.entityView.create({
        data: {
          name: input.name,
          config: input.config,
          entityTypeId: input.entityTypeId,
        },
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        config: entityViewConfigZod.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.entityView.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          config: input.config,
        },
      });
    }),
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.entityView.delete({
        where: {
          id: input.id,
        },
      });
    }),
});

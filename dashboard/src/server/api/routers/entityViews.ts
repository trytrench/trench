import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { entityFiltersZod } from "~/shared/validation";

const configSchema = z.object({
  type: z.enum(["list", "grid"]),
  filters: entityFiltersZod,
  columnOrder: z.array(z.string()).optional(),
  columnVisibility: z.record(z.boolean()).optional(),
});

export const entityViewsRouter = createTRPCRouter({
  list: protectedProcedure
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
        config: view.config as unknown as z.infer<typeof configSchema>,
      }));
    }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        config: configSchema,
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
        config: configSchema.optional(),
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

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  type EntityViewConfig,
  entityViewConfigZod,
} from "~/shared/validation";

function convertISOStringsToDate<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => convertISOStringsToDate(item)) as unknown as T;
  } else if (typeof obj === "object" && obj !== null) {
    const entries = Object.entries(obj).map(([key, value]) => {
      if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/.test(value)
      ) {
        // It's an ISO string, convert it to a Date object
        return [key, new Date(value)];
      } else if (typeof value === "object") {
        // Recursively process the object
        return [key, convertISOStringsToDate(value)];
      } else {
        // Return the value unchanged
        return [key, value];
      }
    });

    return Object.fromEntries(entries) as T;
  } else {
    return obj;
  }
}

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
      return views.map((view) =>
        convertISOStringsToDate({
          ...view,
          config: view.config as unknown as EntityViewConfig,
        })
      );
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

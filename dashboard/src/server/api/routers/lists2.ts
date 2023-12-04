import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const listItemSchema = z.object({
  value: z.string().nonempty(),
  listId: z.string(),
});

const listSchema = z.object({
  name: z.string(),
  alias: z.string(),
});

export const lists2Router = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx, input }) => {
    return ctx.prisma.list.findMany({
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    });
  }),
  create: publicProcedure.input(listSchema).mutation(async ({ ctx, input }) => {
    return ctx.prisma.list.create({
      data: {
        name: input.name,
        alias: input.alias,
        // createdBy: ctx.session.user.id,
      },
    });
  }),
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.listItem.deleteMany({
        where: {
          listId: input.id,
        },
      });

      return ctx.prisma.list.delete({
        where: {
          id: input.id,
        },
      });
    }),
  addItem: publicProcedure
    .input(listItemSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.listItem.create({
        data: {
          value: input.value,
          listId: input.listId,
          // createdBy: ctx.session.user.id,
        },
      });
    }),
  deleteItem: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.listItem.delete({
        where: {
          id: input.id,
        },
      });
    }),
  get: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.list.findUnique({
        where: {
          id: input.id,
        },
        include: {
          items: true,
        },
      });
    }),
});

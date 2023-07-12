import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { uniq } from "lodash";
import {
  DefaultBlockListAlias,
  DEFAULT_BLOCKLISTS,
} from "~/common/defaultBlocklists";
const listSchema = z.object({
  name: z.string().nonempty(),
  alias: z.string().nonempty(),
  regex: z.string().optional(),
});

const itemSchema = z.object({
  value: z.string().nonempty(),
  listId: z.string(),
});

export const listsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        offset: z.number().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [count, rows] = await ctx.prisma.$transaction([
        ctx.prisma.list.count(),
        ctx.prisma.list.findMany({
          skip: input.offset,
          take: input.limit,
          include: {
            _count: {
              select: {
                items: true,
              },
            },
          },
        }),
      ]);
      return {
        count,
        rows: rows.map((list) => {
          return {
            ...list,
            author: undefined,
          };
        }),
      };
    }),
  create: protectedProcedure
    .input(listSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.list.create({
        data: {
          ...input,
          createdBy: ctx.session.user.id,
        },
      });
      return result;
    }),
  addItem: protectedProcedure
    .input(itemSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.listItem.create({
        data: {
          ...input,
          createdBy: ctx.session.user.id,
        },
      });
      return result;
    }),
  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await ctx.prisma.list.findUnique({
        where: {
          id: input.id,
        },
        include: {
          items: true,
        },
      });

      if (!result) return null;

      return {
        ...result,
        author: undefined,
        items: result.items.map((item) => {
          return {
            ...item,
            author: undefined,
          };
        }),
      };
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: listSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.rule.update({
        where: {
          id: input.id,
        },
        data: input.data,
      });
      return result;
    }),
  addDefaultBlocklistItems: protectedProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            value: z.string().nonempty(),
            listAlias: z.nativeEnum(DefaultBlockListAlias),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { items } = input;

      const listAliases = uniq(items.map((item) => item.listAlias));

      const lists = await ctx.prisma.$transaction(
        listAliases.map((alias) =>
          ctx.prisma.list.upsert({
            where: {
              alias,
            },
            update: {
              alias,
            },
            create: {
              alias,
              name: DEFAULT_BLOCKLISTS[alias].name,
              createdBy: ctx.session.user.id,
            },
          })
        )
      );

      const processedItems = items.map((item) => {
        const listId = lists.find((list) => list.alias === item.listAlias)?.id;
        if (!listId) throw new Error("List not found");
        return {
          listId: listId,
          value: item.value,
          createdBy: ctx.session.user.id,
        };
      });

      return ctx.prisma.$transaction(
        processedItems.map((item) =>
          ctx.prisma.listItem.upsert({
            where: {
              listId_value: {
                listId: item.listId,
                value: item.value,
              },
            },
            update: {
              listId: item.listId,
              value: item.value,
            },
            create: item,
          })
        )
      );
    }),
});

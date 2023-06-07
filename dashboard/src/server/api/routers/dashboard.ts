import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { rulesRouter } from "./dashboard/rules";
import { transactionsRouter } from "./dashboard/transactions";
import { listsRouter } from "./dashboard/lists";
import { customersRouter } from "./dashboard/customers";

export const dashboardRouter = createTRPCRouter({
  rules: rulesRouter,
  transactions: transactionsRouter,
  lists: listsRouter,
  customers: customersRouter,
  getSession: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.session.findUnique({
        where: { id: input.id },
        include: {
          customers: {
            include: { customer: true },
          },
          transactions: {
            include: {
              paymentMethod: {
                include: { card: true },
              },
            },
          },
          device: true,
          ipAddress: true,
        },
      });
    }),
  getSessions: protectedProcedure
    .input(
      z.object({
        offset: z.number().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [count, data] = await ctx.prisma.$transaction([
        ctx.prisma.session.count({
          where: {
            customers: {
              some: {},
            },
          },
        }),
        ctx.prisma.session.findMany({
          where: {
            customers: {
              some: {},
            },
          },
          skip: input.offset,
          take: input.limit,
          include: {
            customers: {
              include: { customer: true },
            },
            transactions: true,
            device: true,
            ipAddress: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
      ]);
      return { count, data };
    }),
});

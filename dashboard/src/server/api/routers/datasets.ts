import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { z } from "zod";
import { backTest } from "~/lib/sqrlBacktest";

export const datasetRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.dataset.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  backtest: publicProcedure
    .input(
      z.object({
        from: z.date(),
        to: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      backTest(input.from, input.to);
      console.log("DONE!");
      return true;
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // no deleting prod dataset!
      if (input.id === 0) {
        throw new Error("Cannot delete prod dataset");
      }

      await ctx.prisma.dataset.delete({
        where: {
          id: input.id,
        },
      });
    }),
});

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const datasetsRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.dataset.findMany();
  }),
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.dataset.findUnique({
        where: { id: input.id },
      });
    }),
  listProduction: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.productionDataset.findMany();
  }),
  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        backfillFrom: z.string().optional(),
        backfillTo: z.string().optional(),
        rules: z.array(
          z.object({
            name: z.string(),
            code: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { rules, name, description, backfillFrom, backfillTo } = input;
      const dataset = await ctx.prisma.dataset.create({
        data: {
          name,
          description,
          rules: JSON.stringify(rules),
          backfillFrom,
          backfillTo,
        },
      });

      return dataset;
    }),
});

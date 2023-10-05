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
        backfillFrom: z.string().optional(),
        backfillTo: z.string().optional(),
        files: z.array(
          z.object({
            name: z.string(),
            code: z.string(),
          })
        ),
      })
    )
    .query(async ({ ctx, input }) => {
      const { files, name, backfillFrom, backfillTo } = input;
      const dataset = await ctx.prisma.dataset.create({
        data: {
          name,
          files: JSON.stringify(files),
          backfillFrom,
          backfillTo,
        },
      });

      return dataset;
    }),
});

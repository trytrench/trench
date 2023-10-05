import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const rulesetsRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.ruleset.findMany({
      select: {
        id: true,
        name: true,
      },
    });
  }),
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.ruleset.findUnique({
        where: { id: input.id },
      });
    }),
  getProduction: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.productionRuleset.findFirst();
  }),
  setProduction: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const ruleset = await ctx.prisma.ruleset.findUnique({
        where: { id: input.id },
      });

      if (!ruleset) {
        throw new Error("Ruleset not found");
      }

      await ctx.prisma.productionRuleset.updateMany({
        data: { rulesetId: ruleset.id },
      });
    }),
  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        files: z.array(
          z.object({
            name: z.string(),
            code: z.string(),
          })
        ),
      })
    )
    .query(async ({ ctx, input }) => {
      const { files, name } = input;
      const ruleset = await ctx.prisma.ruleset.create({
        data: {
          name,
          files: JSON.stringify(files),
        },
      });

      return ruleset;
    }),
});

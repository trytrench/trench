import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { runRule } from "~/server/utils/rules";
import { RiskLevel } from "../../../../common/types";
import { type RuleInput } from "../../../transforms/ruleInput";

const ruleSchema = z.object({
  name: z.string().nonempty(),
  description: z.string().nullable(),
  tsCode: z.string().nonempty(),
  jsCode: z.string().nonempty(),
  riskLevel: z.nativeEnum(RiskLevel),
});

export const rulesRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        offset: z.number().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [count, rows] = await ctx.prisma.$transaction([
        ctx.prisma.rule.count(),
        ctx.prisma.rule.findMany({
          skip: input.offset,
          take: input.limit,
          include: {
            _count: { select: { executions: { where: { result: true } } } },
          },
        }),
      ]);

      return {
        count,
        rows,
      };
    }),
  backtest: protectedProcedure
    .input(
      z.object({
        jsCode: z.string().nonempty(),
        lastNDays: z.enum(["3", "7", "30"]),
      })
    )
    .mutation(async ({ ctx, input: ruleToBacktest }) => {
      const [paymentAttempts, lists] = await ctx.prisma.$transaction([
        ctx.prisma.paymentAttempt.findMany({
          orderBy: {
            createdAt: "desc",
          },
          where: {
            createdAt: {
              gte: new Date(
                new Date().getTime() -
                  Number(ruleToBacktest.lastNDays) * 24 * 60 * 60 * 1000
              ),
            },
          },
          include: {
            assessment: true,
            checkoutSession: {
              include: {
                paymentAttempts: true,
                customer: true,
                deviceSnapshot: {
                  include: {
                    device: true,
                    ipAddress: {
                      include: {
                        location: true,
                      },
                    },
                  },
                },
              },
            },
            paymentMethod: {
              include: {
                address: true,
                card: true,
              },
            },
            outcome: true,
          },
        }),
        ctx.prisma.list.findMany({
          include: {
            items: true,
          },
        }),
      ]);

      const listsObj = lists.reduce((acc, list) => {
        acc[list.alias] = list.items.map((item) => item.value);
        return acc;
      }, {} as Record<string, string[]>);

      const triggeredTransactions: typeof paymentAttempts = [];

      paymentAttempts.forEach((paymentAttempt) => {
        const result = runRule({
          rule: {
            jsCode: ruleToBacktest.jsCode,
            riskLevel: RiskLevel.VeryHigh,
          },
          input: {
            paymentAttempt,
            transforms: paymentAttempt.assessment
              ?.transformsOutput as RuleInput["transforms"],
            lists: listsObj,
          },
        });
        if (result.result === true) {
          triggeredTransactions.push(paymentAttempt);
        }
      });

      return {
        triggeredRows: triggeredTransactions,
        triggered: triggeredTransactions.length,
        total: paymentAttempts.length,
      };
    }),
  create: protectedProcedure
    .input(ruleSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.rule.create({
        data: input,
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
      return ctx.prisma.rule.findUnique({
        where: {
          id: input.id,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: ruleSchema,
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
});

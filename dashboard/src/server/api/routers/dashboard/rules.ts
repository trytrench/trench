import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { RiskLevel } from "@prisma/client";
import { runRule } from "~/server/utils/rules";

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
      return ctx.prisma.rule.findMany({
        skip: input.offset,
        take: input.limit,
        include: {
          _count: { select: { executions: { where: { result: true } } } },
        },
      });
    }),
  backtest: protectedProcedure
    .input(
      z.object({
        jsCode: z.string().nonempty(),
        lastNDays: z.enum(["3", "7", "30"]),
      })
    )
    .mutation(async ({ ctx, input: ruleToBacktest }) => {
      const [transactions, lists] = await ctx.prisma.$transaction([
        ctx.prisma.transaction.findMany({
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
            session: {
              include: {
                transactions: true,
                device: true,
                ipAddress: true,
              },
            },
            paymentMethod: {
              include: {
                card: true,
              },
            },
            customer: true,
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

      const triggeredTransactions: typeof transactions = [];

      transactions.forEach((transaction) => {
        const result = runRule({
          rule: {
            jsCode: ruleToBacktest.jsCode,
            riskLevel: RiskLevel.VeryHigh,
          },
          payload: {
            transaction: transaction,
            aggregations: transaction.transforms,
            lists: listsObj,
          },
        });
        if (result.result === true) {
          triggeredTransactions.push(transaction);
        }
      });

      return triggeredTransactions;
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
  getStatistics: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result: any = await ctx.prisma.$queryRaw`
      SELECT DATE_TRUNC('day', "Transaction"."createdAt") AS day, 
      COUNT(CASE WHEN "RuleExecution"."result" = false THEN 1 END) AS "falseCount",
      COUNT(CASE WHEN "RuleExecution"."result" = true THEN 1 END) AS "trueCount",
      COUNT(CASE WHEN "RuleExecution"."error" IS NOT NULL THEN 1 END) AS "errorCount"
      FROM "RuleExecution"
      JOIN "Transaction" ON "Transaction".id = "RuleExecution"."transactionId"
      WHERE "ruleId" = ${input.id}
      AND "Transaction"."createdAt" > NOW() - INTERVAL '7 days'
      GROUP BY day
    `;

      const ruleActivationChart: {
        date: Date;
        trueCount: number;
        falseCount: number;
        errorCount: number;
      }[] = result
        .map((item: any) => {
          return {
            date: item.day as Date,
            trueCount: Number(item.trueCount),
            falseCount: Number(item.falseCount),
            errorCount: Number(item.errorCount),
          };
        })
        .sort((a: any, b: any) => {
          return a.date.getTime() - b.date.getTime();
        });

      return {
        ruleActivationChart,
      };
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

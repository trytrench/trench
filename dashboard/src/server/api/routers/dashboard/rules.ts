import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { runRule } from "~/server/utils/rules";
import { RiskLevel } from "../../../../common/types";
import { type PaymentTransformInput } from "../../../transforms/paymentTransforms";

const ruleSchema = z.object({
  name: z.string().nonempty(),
  description: z.string().nullable(),
  tsCode: z.string().nonempty(),
  jsCode: z.string().nonempty(),
  userFlow: z.string().nonempty(),
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
            currentRuleSnapshot: {
              include: {
                _count: {
                  select: {
                    executions: {
                      where: {
                        result: true,
                      },
                    },
                  },
                },
              },
            },
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
        userFlow: z.string(),
        jsCode: z.string().nonempty(),
        lastNDays: z.enum(["3", "7", "30"]),
      })
    )
    .mutation(async ({ ctx, input: ruleToBacktest }) => {
      const [actions, lists] = await ctx.prisma.$transaction([
        ctx.prisma.evaluableAction.findMany({
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
            session: {
              userFlowId: ruleToBacktest.userFlow,
            },
          },
          include: {
            session: {
              include: {
                evaluableActions: true,
                user: true,
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
            kycAttempt: true,
            paymentAttempt: {
              include: {
                paymentMethod: {
                  include: {
                    address: true,
                    card: true,
                  },
                },
                outcome: true,
              },
            },
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

      const triggeredTransactions: typeof actions = [];

      actions.forEach((action) => {
        const result = runRule({
          rule: {
            jsCode: ruleToBacktest.jsCode,
            riskLevel: RiskLevel.VeryHigh,
          },
          input: {
            evaluableAction: action,
            transforms:
              action?.transformsOutput as PaymentTransformInput["transforms"],
            lists: listsObj,
          },
        });
        if (result.result === true) {
          triggeredTransactions.push(action);
        }
      });

      return {
        triggeredRows: triggeredTransactions,
        triggered: triggeredTransactions.length,
        total: actions.length,
      };
    }),
  create: protectedProcedure
    .input(ruleSchema)
    .mutation(async ({ ctx, input }) => {
      const { userFlow, ...rest } = input;

      const result = await ctx.prisma.rule.create({
        data: {
          currentRuleSnapshot: {
            create: rest,
          },
        },
      });

      await ctx.prisma.ruleToUserFlow.create({
        data: {
          rule: { connect: { id: result.id } },
          userFlow: { connect: { id: userFlow } },
        },
      });

      // Point rule snapshot to the rule
      await ctx.prisma.ruleSnapshot.update({
        where: {
          id: result.currentRuleSnapshotId,
        },
        data: {
          rule: { connect: { id: result.id } },
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
      return ctx.prisma.rule.findUnique({
        where: {
          id: input.id,
        },
        include: {
          currentRuleSnapshot: true,
          userFlows: true,
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
      const { userFlow, ...rest } = input.data;
      const newRuleSnapshot = await ctx.prisma.ruleSnapshot.create({
        data: rest,
      });

      const result = await ctx.prisma.rule.update({
        where: {
          id: input.id,
        },
        data: {
          currentRuleSnapshot: { connect: { id: newRuleSnapshot.id } },
        },
      });

      // TODO: Update user flow here

      return result;
    }),
});

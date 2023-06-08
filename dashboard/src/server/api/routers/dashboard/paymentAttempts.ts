import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { PaymentOutcomeStatus, type Prisma } from "@prisma/client";
import { RiskLevel } from "../../../../common/types";

function getSearchOption(search?: string) {
  return search
    ? {
        contains: `%${search}%`,
        mode: "insensitive" as const,
      }
    : undefined;
}

export const paymentAttemptsRouter = createTRPCRouter({
  assessment: createTRPCRouter({
    updateMany: protectedProcedure
      .input(
        z.object({
          ids: z.array(z.string()),
          changes: z.object({
            isFraud: z.boolean().optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { ids, changes } = input;
        return ctx.prisma.paymentAttemptAssessment.updateMany({
          where: { id: { in: ids } },
          data: changes,
        });
      }),
  }),

  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.paymentAttempt.findUnique({
        where: {
          id: input.id,
        },
        include: {
          ruleExecutions: {
            where: {
              result: true,
            },
            include: {
              rule: true,
            },
          },
          paymentMethod: {
            include: {
              card: true,
            },
          },
          customer: true,
          outcome: true,
          checkoutSession: {
            include: {
              deviceSnapshot: {
                include: {
                  device: true,
                },
              },
              paymentAttempts: true,
              events: true,
            },
          },
        },
      });
    }),
  getAll: protectedProcedure
    .input(
      z.object({
        offset: z.number().optional(),
        limit: z.number().optional(),
        executedRuleId: z.string().optional(),
        linkedPaymentAttemptId: z.string().optional(),
        customerId: z.string().optional(),
        search: z
          .object({
            sellerName: z.string().optional(),
            sellerId: z.string().optional(),
            email: z.string().optional(),
            description: z.string().optional(),
            status: z.nativeEnum(PaymentOutcomeStatus).optional(),
            riskLevel: z.nativeEnum(RiskLevel).optional(),
            isFraud: z.string().optional(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      let linkedPaymentAttempt;
      if (input.linkedPaymentAttemptId) {
        linkedPaymentAttempt = await ctx.prisma.paymentAttempt.findUnique({
          where: {
            id: input.linkedPaymentAttemptId,
          },
          include: {
            paymentMethod: {
              include: {
                card: true,
              },
            },
            customer: true,
            checkoutSession: {
              include: {
                deviceSnapshot: {
                  include: {
                    ipAddress: true,
                    device: true,
                  },
                },
                paymentAttempts: true,
                events: true,
              },
            },
          },
        });
        if (!linkedPaymentAttempt) throw new Error("Transaction not found");
      }

      const filter: Prisma.PaymentAttemptFindManyArgs["where"] = {
        description: getSearchOption(input.search?.description),
        assessment: {
          isFraud:
            input.search?.isFraud === "true"
              ? true
              : input.search?.isFraud === "false"
              ? false
              : undefined,
          riskLevel: input.search?.riskLevel,
        },
        outcome: {
          status: input.search?.status,
        },

        customer: {
          email: getSearchOption(input.search?.email),
        },
        customerId: input.customerId,
        ruleExecutions: input.executedRuleId
          ? {
              some: {
                ruleId: input.executedRuleId,
                result: true,
              },
            }
          : undefined,
        ...(linkedPaymentAttempt && {
          id: { not: linkedPaymentAttempt.id },
          OR: [
            {
              checkoutSession: {
                deviceSnapshot: {
                  deviceId:
                    linkedPaymentAttempt.checkoutSession.deviceSnapshot
                      ?.deviceId,
                },
              },
            },
            {
              checkoutSession: {
                deviceSnapshot: {
                  fingerprint:
                    linkedPaymentAttempt.checkoutSession.deviceSnapshot
                      ?.fingerprint,
                },
              },
            },
            {
              checkoutSession: {
                deviceSnapshot: {
                  ipAddress: {
                    ipAddress:
                      linkedPaymentAttempt.checkoutSession.deviceSnapshot
                        ?.ipAddress.ipAddress,
                  },
                },
              },
            },
            { customer: { email: linkedPaymentAttempt.customer?.email } },
            {
              customer: {
                phoneNumber: linkedPaymentAttempt.customer?.phoneNumber,
              },
            },
            // { customer: { name: linkedPaymentAttempt.customer?.name } },
            {
              paymentMethod: {
                card: { id: linkedPaymentAttempt.paymentMethod.card?.id },
              },
            },
            // { walletAddress: linkedPaymentAttempt.walletAddress },
          ],
        }),
      };

      const [count, data] = await ctx.prisma.$transaction([
        ctx.prisma.paymentAttempt.count({
          where: filter,
        }),
        ctx.prisma.paymentAttempt.findMany({
          skip: input.offset,
          take: input.limit,
          where: filter,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            assessment: true,
            customer: true,
            paymentMethod: {
              include: {
                card: true,
              },
            },
            outcome: true,
          },
        }),
      ]);
      return { count, data };
    }),
});

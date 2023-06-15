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
          paymentAttemptIds: z.array(z.string()),
          changes: z.object({
            isFraud: z.boolean().optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { paymentAttemptIds, changes } = input;
        return ctx.prisma.paymentAttemptAssessment.updateMany({
          where: { paymentAttemptId: { in: paymentAttemptIds } },
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
              address: {
                include: {
                  location: true,
                },
              },
            },
          },
          customerLink: {
            include: {
              customer: true,
            },
          },
          assessment: true,
          outcome: true,
          checkoutSession: {
            include: {
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
            customerLink: {
              include: {
                customer: true,
              },
            },
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
        if (!linkedPaymentAttempt) throw new Error("Payment attempt not found");
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
        customerLink: input.search?.email
          ? {
              customer: {
                email: getSearchOption(input.search?.email),
              },
              customerId: input.customerId,
            }
          : undefined,
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
                      ?.deviceId ?? undefined,
                },
              },
            },
            {
              checkoutSession: {
                deviceSnapshot: {
                  fingerprint:
                    linkedPaymentAttempt.checkoutSession.deviceSnapshot
                      ?.fingerprint ?? undefined,
                },
              },
            },
            {
              checkoutSession: {
                deviceSnapshot: {
                  ipAddress: {
                    ipAddress:
                      linkedPaymentAttempt.checkoutSession.deviceSnapshot
                        ?.ipAddress?.ipAddress ?? undefined,
                  },
                },
              },
            },
            {
              paymentMethod: {
                card: { id: linkedPaymentAttempt.paymentMethod.card?.id },
              },
            },
            {
              customerLink: linkedPaymentAttempt.customerLink?.customer.email
                ? {
                    customer: {
                      email: linkedPaymentAttempt.customerLink.customer.email,
                    },
                  }
                : undefined,
            },
            {
              customerLink: linkedPaymentAttempt.customerLink?.customer.phone
                ? {
                    customer: {
                      phone: linkedPaymentAttempt.customerLink.customer.phone,
                    },
                  }
                : undefined,
            },
          ],
        }),
      };

      const [count, data] = await ctx.prisma.$transaction([
        ctx.prisma.paymentAttempt.count({
          // where: filter,
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
            customerLink: {
              include: { customer: true },
            },
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

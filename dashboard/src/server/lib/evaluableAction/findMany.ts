import { PaymentOutcomeStatus, type Prisma } from "@prisma/client";
import { z } from "zod";
import { EvaluableActionType, RiskLevel } from "../../../common/types";

export const findManyZod = z.object({
  offset: z.number().optional(),
  limit: z.number().optional(),
  type: z.nativeEnum(EvaluableActionType).optional(),
  filters: z.object({
    // Directly corresponds to search bar filters
    userId: z.string().optional(),
    email: z.string().optional(),
    riskLevel: z.nativeEnum(RiskLevel).optional(),
    isFraud: z.boolean().optional(),

    // Payment attempt specific filters
    description: z.string().optional(),
    status: z.nativeEnum(PaymentOutcomeStatus).optional(),
    // sellerName: z.string().optional(),
    // sellerId: z.string().optional(),
  }),
  executedRuleSnapshotId: z.string().optional(),
  linkedTo: z
    .object({
      // Other evaluable actions that are linked to this one
      paymentAttemptActionId: z.string().optional(),
    })
    .optional(),
});

export type FindManyArgs = z.infer<typeof findManyZod>;

export function getFindManyIncludeArgs(actionType?: EvaluableActionType) {
  const baseArgs = {
    session: {
      include: {
        stripeReview: true,
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
  } satisfies Prisma.EvaluableActionFindManyArgs["include"];

  return {
    ...baseArgs,
    ...getFindManyIncludeArgsForPaymentAttempt(actionType),
  };
}

function getFindManyIncludeArgsForPaymentAttempt(
  actionType?: EvaluableActionType
) {
  if (!!actionType && actionType !== EvaluableActionType.PaymentAttempt) {
    return undefined;
  }
  return {
    paymentAttempt: {
      include: {
        outcome: true,
        paymentMethod: {
          include: {
            card: true,
          },
        },
      },
    },
  };
}

///////////////// WHERE ARGS //////////////////////

export function getSearchOption(filter?: string) {
  return filter
    ? {
        contains: `%${filter}%`,
        mode: "insensitive" as const,
      }
    : undefined;
}

export function getFindManyWhereArgs(input: FindManyArgs) {
  const { filters } = input;
  const baseWhere = {
    isFraud: filters?.isFraud,
    riskLevel: filters?.riskLevel,
    session: {
      userId: filters?.userId,
      user: filters?.email
        ? {
            email: getSearchOption(filters?.email),
          }
        : undefined,
    },
    ruleExecutions: input.executedRuleSnapshotId
      ? {
          some: {
            ruleSnapshotId: input.executedRuleSnapshotId,
            result: true,
          },
        }
      : undefined,

    // Payment attempt specific filters
    paymentAttempt: {
      description: getSearchOption(filters?.description),
      outcome: {
        status: filters?.status,
      },
    },
  } satisfies Prisma.EvaluableActionFindManyArgs["where"];

  return baseWhere;
}

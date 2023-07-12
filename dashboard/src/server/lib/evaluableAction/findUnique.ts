import { type Prisma } from "@prisma/client";
import { EvaluableActionType } from "../../../common/types";

export function getFindUniqueIncludeArgs(actionType?: EvaluableActionType) {
  const baseIncludeArgs = {
    ruleExecutions: {
      where: {
        result: true,
      },
      include: {
        ruleSnapshot: true,
      },
    },
    session: {
      include: {
        user: true,
        stripeReview: true,
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
        events: true,
      },
    },
  } satisfies Prisma.EvaluableActionFindUniqueArgs["include"];

  return {
    ...baseIncludeArgs,
    ...getPaymentAttemptIncludeArgs(actionType),
  };
}

function getPaymentAttemptIncludeArgs(actionType?: EvaluableActionType) {
  if (!!actionType && actionType !== EvaluableActionType.PaymentAttempt) {
    return undefined;
  }
  return {
    paymentAttempt: {
      include: {
        outcome: true,
        paymentMethod: {
          include: {
            address: {
              include: {
                location: true,
              },
            },
            card: true,
          },
        },
      },
    },
  } satisfies Prisma.EvaluableActionFindUniqueArgs["include"];
}

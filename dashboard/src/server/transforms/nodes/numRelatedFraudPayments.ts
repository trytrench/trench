import { node } from "../flow";
import { getFindManyIncludeArgs } from "../../lib/evaluableAction/findMany";
import { EvaluableActionType } from "../../../common/types";
import { type PrismaClient, type Prisma } from "@prisma/client";

export const numRelatedFraudPayments = node.resolver(async ({ input, ctx }) => {
  const { evaluableAction } = input;

  const where = await getLinkedToFraudPaymentAttemptWhereArgs(
    ctx.prisma,
    evaluableAction.id
  );

  const results = await ctx.prisma.evaluableAction.findMany({
    where,
  });

  return results.length;
});

// Link to other fraudulent payment attempts
// only consider device, card, and email.
async function getLinkedToFraudPaymentAttemptWhereArgs(
  prisma: PrismaClient,
  evaluableActionId: string
): Promise<Prisma.EvaluableActionWhereInput> {
  const linkedAction = await prisma.evaluableAction.findUnique({
    where: { id: evaluableActionId },
    include: getFindManyIncludeArgs(EvaluableActionType.PaymentAttempt),
  });
  if (!linkedAction) {
    throw new Error("Payment attempt not found");
  }

  const deviceSnapshot = linkedAction.session.deviceSnapshot;

  const orClauses: Prisma.EvaluableActionWhereInput[] = [
    {
      session: {
        deviceSnapshot: {
          deviceId: deviceSnapshot?.deviceId,
        },
      },
    },
    {
      session: {
        deviceSnapshot: { fingerprint: deviceSnapshot?.fingerprint },
      },
    },
    {
      paymentAttempt: {
        paymentMethod: {
          card: {
            id: linkedAction.paymentAttempt?.paymentMethod.card?.id,
          },
        },
      },
    },
  ];

  const userEmail = linkedAction.session.user?.email;
  if (userEmail) {
    orClauses.push({
      session: {
        user: {
          AND: [{ email: userEmail }, { email: { not: null } }],
        },
      },
    });
  }

  return {
    id: { not: evaluableActionId },
    OR: orClauses,
    isFraud: true,
    paymentAttempt: {
      createdAt: { lte: linkedAction.paymentAttempt?.createdAt },
    },
  };
}

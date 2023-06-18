import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { type PrismaClient, type Prisma } from "@prisma/client";
import { merge } from "lodash";
import { EvaluableActionType, RiskLevel } from "../../../../common/types";
import {
  findManyZod,
  getFindManyIncludeArgs,
  getFindManyWhereArgs,
} from "../../../lib/evaluableAction/findMany";
import { getFindUniqueIncludeArgs } from "../../../lib/evaluableAction/findUnique";

export const evaluableActionsRouter = createTRPCRouter({
  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        type: z.nativeEnum(EvaluableActionType).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.evaluableAction.findUnique({
        where: { id: input.id },
        include: getFindUniqueIncludeArgs(input.type),
      });
    }),

  getAll: protectedProcedure
    .input(findManyZod)
    .query(async ({ ctx, input }) => {
      let whereArgs = getFindManyWhereArgs(input);

      if (input.linkedTo?.paymentAttemptActionId) {
        const linkedToPaymentAttemptWhereArgs =
          await getLinkedToPaymentAttemptWhereArgs(
            ctx.prisma,
            input.linkedTo.paymentAttemptActionId
          );
        whereArgs = merge(whereArgs, linkedToPaymentAttemptWhereArgs);
      }

      const [count, rows] = await ctx.prisma.$transaction([
        ctx.prisma.evaluableAction.count({
          where: whereArgs,
        }),
        ctx.prisma.evaluableAction.findMany({
          skip: input.offset,
          take: input.limit,
          include: getFindManyIncludeArgs(input.type),
          orderBy: {
            createdAt: "desc",
          },
          where: whereArgs,
        }),
      ]);

      return {
        count,
        rows,
      };
    }),

  updateMany: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
        data: z.object({
          isFraud: z.boolean().optional(),
          riskLevel: z.nativeEnum(RiskLevel).optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { ids, data } = input;

      const updatedRows = await ctx.prisma.evaluableAction.updateMany({
        where: { id: { in: ids } },
        data,
      });

      return updatedRows;
    }),
});

async function getLinkedToPaymentAttemptWhereArgs(
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
      session: {
        deviceSnapshot: {
          ipAddress: { ipAddress: deviceSnapshot?.ipAddress?.ipAddress },
        },
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

  const userPhone = linkedAction.session.user?.phone;
  if (userPhone) {
    orClauses.push({
      session: {
        user: {
          AND: [
            { phone: linkedAction.session.user?.phone },
            { phone: { not: null } },
          ],
        },
      },
    });
  }

  return {
    id: { not: evaluableActionId },
    OR: orClauses,
  };
}

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
import { paymentTransforms } from "../../../transforms/paymentTransforms";
import { runRules } from "../../../utils/rules";
import SuperJSON from "superjson";
import { cardAggregationsNode } from "../../../transforms/nodes/aggregations/card";

export const evaluableActionsRouter = createTRPCRouter({
  evaluate: protectedProcedure
    .input(
      z.object({
        evaluableActionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const evaluableAction = await ctx.prisma.evaluableAction.findUnique({
        include: {
          paymentAttempt: {
            include: {
              paymentMethod: {
                include: {
                  card: true,
                  address: {
                    include: { location: true },
                  },
                },
              },
            },
          },
          session: {
            include: {
              user: true,
              deviceSnapshot: {
                include: {
                  ipAddress: {
                    include: { location: true },
                  },
                  device: true,
                },
              },
            },
          },
        },
        where: {
          id: input.evaluableActionId,
        },
      });

      if (!evaluableAction) {
        throw new Error("Evaluable action not found");
      }

      const [rules, lists] = await ctx.prisma.$transaction([
        ctx.prisma.rule.findMany({
          include: {
            currentRuleSnapshot: true,
          },
        }),
        ctx.prisma.list.findMany({
          include: {
            items: true,
          },
        }),
      ]);
      const blockLists = lists.reduce((acc, list) => {
        acc[list.alias] = list.items.map((item) => item.value);
        return acc;
      }, {} as Record<string, string[]>);

      const ruleInput = await paymentTransforms.run({
        evaluableAction,
        blockLists,
      });

      const { ruleExecutionResults, highestRiskLevel } = runRules({
        rules: rules.map((rule) => rule.currentRuleSnapshot),
        input: ruleInput,
      });

      const ipLocationUpdate: Prisma.LocationCreateArgs["data"] = {
        latitude: ruleInput.transforms.ipData?.latitude,
        longitude: ruleInput.transforms.ipData?.longitude,
        countryISOCode: ruleInput.transforms.ipData?.countryISOCode,
        countryName: ruleInput.transforms.ipData?.countryName,
        postalCode: ruleInput.transforms.ipData?.postalCode,
      };

      const paymentMethodLocationUpdate: Prisma.LocationCreateArgs["data"] = {
        latitude: ruleInput.transforms.paymentMethodLocation?.latitude,
        longitude: ruleInput.transforms.paymentMethodLocation?.longitude,
        countryISOCode: ruleInput.transforms.paymentMethodLocation?.countryCode,
      };

      await ctx.prisma.$transaction([
        ctx.prisma.ruleExecution.deleteMany({
          where: {
            evaluableActionId: evaluableAction.id,
          },
        }),
        ctx.prisma.ruleExecution.createMany({
          data: rules
            .map((rule, index) => {
              const result = ruleExecutionResults[index];
              if (!result) {
                return null;
              }
              return {
                result: result?.result,
                error: result?.error,
                riskLevel: result.riskLevel,
                evaluableActionId: evaluableAction.id,
                ruleSnapshotId: rule.currentRuleSnapshot.id,
              };
            })
            .filter(
              (rule) => rule !== null
            ) as Prisma.RuleExecutionCreateManyInput[],
        }),
        ctx.prisma.evaluableAction.update({
          where: { id: evaluableAction.id },
          data: {
            riskLevel: highestRiskLevel,
            transformsOutput: SuperJSON.parse(
              SuperJSON.stringify(ruleInput.transforms)
            ),
          },
        }),
        ctx.prisma.evaluableAction.update({
          where: { id: evaluableAction.id },
          data: {
            session: {
              update: {
                deviceSnapshot: {
                  update: {
                    ipAddress: {
                      update: {
                        metadata: ruleInput.transforms.ipData,
                        location: ruleInput.transforms.ipData
                          ? {
                              upsert: {
                                update: ipLocationUpdate,
                                create: ipLocationUpdate,
                              },
                            }
                          : undefined,
                      },
                    },
                  },
                },
              },
            },
            paymentAttempt: {
              update: {
                paymentMethod: {
                  update: {
                    address: {
                      update: {
                        location: {
                          upsert: ruleInput.transforms.paymentMethodLocation
                            ? {
                                update: paymentMethodLocationUpdate,
                                create: paymentMethodLocationUpdate,
                              }
                            : undefined,
                        },
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
        highestRiskLevel,
        ruleExecutionResults,
      };
    }),

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

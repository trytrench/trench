import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { stripe } from "../../../lib/stripe";
import { UserFlow } from "~/common/types";
import { kycTransforms } from "~/server/transforms/kycTransforms";
import { runRules } from "~/server/utils/rules";
import { Prisma } from "@prisma/client";
import superjson from "superjson";

export const verificationsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        offset: z.number().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [count, rows] = await ctx.prisma.$transaction([
        ctx.prisma.kycAttempt.count(),
        ctx.prisma.kycAttempt.findMany({
          skip: input.offset,
          take: input.limit,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            evaluableAction: true,
          },
        }),
      ]);

      return {
        count,
        rows,
      };
    }),
  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await ctx.prisma.kycAttempt.findUnique({
        where: {
          id: input.id,
        },
        include: {
          address: {
            include: {
              location: true,
            },
          },
          evaluableAction: {
            include: {
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
            },
          },
        },
      });

      if (!result) return null;

      let stripeFiles;
      try {
        stripeFiles = {
          selfie: await stripe.fileLinks.create({
            file: result.selfieFile,
            expires_at: Math.floor(Date.now() / 1000) + 30,
          }),
          selfieDocument: await stripe.fileLinks.create({
            file: result.selfieDocument,
            expires_at: Math.floor(Date.now() / 1000) + 30,
          }),
          files: await Promise.all(
            result.documentFiles.map((file) =>
              stripe.fileLinks.create({
                file,
                expires_at: Math.floor(Date.now() / 1000) + 30,
              })
            )
          ),
        };
      } catch (error) {}

      return {
        ...result,
        ...stripeFiles,
      };
    }),
  evaluate: protectedProcedure
    .input(
      z.object({
        evaluableActionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const evaluableAction = await ctx.prisma.evaluableAction.findUnique({
        include: {
          kycAttempt: {
            include: {
              address: {
                include: {
                  location: true,
                },
              },
            },
          },
          // TODO: Remove
          // We include this to fix types
          paymentAttempt: {
            include: {
              paymentMethod: {
                include: {
                  card: true,
                  address: true,
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
          where: {
            userFlows: {
              some: {
                userFlow: {
                  name: UserFlow.SellerKyc,
                },
              },
            },
          },
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

      const ruleInput = await kycTransforms.run({
        evaluableAction,
        blockLists,
      });

      const { ruleExecutionResults, highestRiskLevel } = runRules({
        rules: rules.map((rule) => rule.currentRuleSnapshot),
        input: ruleInput,
      });

      const ipData = ruleInput.transforms.ipData;
      const ipLocationUpdate: Prisma.LocationCreateArgs["data"] = {
        latitude: ipData?.latitude,
        longitude: ipData?.longitude,
        cityGeonameId: ipData?.cityGeonameId,
        cityName: ipData?.cityName,
        countryISOCode: ipData?.countryISOCode,
        countryName: ipData?.countryName,
        postalCode: ipData?.postalCode,
        regionISOCode: ipData?.subdivisionISOCode,
        regionName: ipData?.subdivisionName,
      };

      const kycLocationUpdate: Prisma.LocationCreateArgs["data"] = {
        latitude: ruleInput.transforms.kycLocation.latitude,
        longitude: ruleInput.transforms.kycLocation.longitude,
        countryISOCode: ruleInput.transforms.kycLocation.countryCode,
      };

      await ctx.prisma.$transaction([
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
            transformsOutput: superjson.parse(
              superjson.stringify(ruleInput.transforms)
            ),
            ...(evaluableAction.session.deviceSnapshot && {
              session: {
                update: {
                  deviceSnapshot: {
                    update: {
                      ipAddress: {
                        update: ipData
                          ? {
                              metadata: ipData,
                              location: {
                                upsert: {
                                  update: ipLocationUpdate,
                                  create: ipLocationUpdate,
                                },
                              },
                            }
                          : undefined,
                      },
                    },
                  },
                },
              },
            }),
            kycAttempt: {
              update: {
                address: {
                  update: {
                    location: {
                      upsert: ruleInput.transforms.kycLocation
                        ? {
                            update: kycLocationUpdate,
                            create: kycLocationUpdate,
                          }
                        : undefined,
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

      return { riskLevel: highestRiskLevel };
    }),
});

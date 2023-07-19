import { type Prisma, PrismaClient } from "@prisma/client";
import { runRules } from "../server/utils/rules";
import superjson from "superjson";
import { UserFlow } from "~/common/types";
import { kycTransforms } from "~/server/transforms/kycTransforms";

const prisma = new PrismaClient();

main().catch((error) => {
  console.log(error);
  process.exit(1);
});

async function main() {
  const kycEvaluableActions = await prisma.evaluableAction.findMany({
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
      kycAttempt: {
        isNot: null,
      },
      paymentAttempt: {
        is: null,
      },
    },
  });

  const [rules, lists] = await prisma.$transaction([
    prisma.rule.findMany({
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
    prisma.list.findMany({
      include: {
        items: true,
      },
    }),
  ]);

  const blockLists = lists.reduce((acc, list) => {
    acc[list.alias] = list.items.map((item) => item.value);
    return acc;
  }, {} as Record<string, string[]>);

  console.log(kycEvaluableActions.length);

  for (const evaluableAction of kycEvaluableActions) {
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
      latitude: ruleInput.transforms.kycLocation?.latitude,
      longitude: ruleInput.transforms.kycLocation?.longitude,
      countryISOCode: ruleInput.transforms.kycLocation?.countryCode,
    };

    await prisma.$transaction([
      prisma.ruleExecution.createMany({
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
      prisma.evaluableAction.update({
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
  }
}

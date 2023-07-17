import { type Prisma, PrismaClient } from "@prisma/client";
import { paymentTransforms } from "../server/transforms/paymentTransforms";
import { runRules } from "../server/utils/rules";
import SuperJSON from "superjson";

const prisma = new PrismaClient();

main().catch((error) => {
  console.log(error);
  process.exit(1);
});

async function main() {
  const [rules, lists] = await prisma.$transaction([
    prisma.rule.findMany({
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

  const allEvaluableActions = await prisma.evaluableAction.findMany({
    take: 1,
    orderBy: {
      createdAt: "desc",
    },
    where: {
      isFraud: true,
    },
    take: 20,
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
  });

  const BATCH_SIZE = 20;
  const BATCHES = Math.ceil(allEvaluableActions.length / BATCH_SIZE);

  for (let i = 0; i < BATCHES; i++) {
    console.log(`Processing batch ${i + 1}/${BATCHES}...`);

    const batch = allEvaluableActions.slice(
      i * BATCH_SIZE,
      (i + 1) * BATCH_SIZE
    );

    await Promise.all(
      batch.map(async (evaluableAction) => {
        const ruleInput = await paymentTransforms.run({
          evaluableAction,
          blockLists,
        });

        // console.log(JSON.stringify(ruleInputNode.getArtifacts(), null, 2));

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
          countryISOCode:
            ruleInput.transforms.paymentMethodLocation?.countryCode,
        };

        return prisma.$transaction([
          prisma.ruleExecution.deleteMany({
            where: {
              evaluableActionId: evaluableAction.id,
            },
          }),
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
              transformsOutput: SuperJSON.parse(
                SuperJSON.stringify(ruleInput.transforms)
              ),
            },
          }),
          prisma.evaluableAction.update({
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
      })
    );
  }
}

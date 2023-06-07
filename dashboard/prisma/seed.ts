import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.PROD_DATABASE_URL,
    },
  },
});

const devPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  const txs = await prodPrisma.transaction.findMany({
    take: 100,
    include: {
      customer: true,
      session: {
        include: {
          device: true,
          ipAddress: true,
        },
      },
      outcome: true,
      paymentMethod: {
        include: {
          card: true,
        },
      },
      ruleExecutions: {
        include: {
          rule: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  await devPrisma.$transaction(
    txs.map((tx) =>
      devPrisma.transaction.upsert({
        where: {
          id: tx.id,
        },
        update: {},
        create: {
          ...tx,
          description: faker.word.words(2),
          sellerName: faker.company.name(),
          transforms: tx.transforms ?? {},
          sessionId: undefined,
          session: {
            connectOrCreate: {
              where: {
                id: tx.sessionId,
              },
              create: {
                ...tx.session,
                deviceId: undefined,
                device: {
                  connectOrCreate: {
                    where: {
                      id: tx.session.device.id,
                    },
                    create: {
                      ...tx.session.device,
                      components: tx.session.device.components ?? {},
                    },
                  },
                },
                ipAddressId: undefined,
                ipAddress: {
                  connectOrCreate: {
                    where: {
                      id: tx.session.ipAddress.id,
                    },
                    create: {
                      ...tx.session.ipAddress,
                    },
                  },
                },
              },
            },
          },
          paymentMethodId: undefined,
          paymentMethod: {
            connectOrCreate: {
              where: {
                id: tx.paymentMethodId,
              },
              create: {
                ...tx.paymentMethod,
                name: faker.person.fullName(),
                line1: faker.location.streetAddress(),
                line2: faker.location.secondaryAddress(),
                geocode: tx.paymentMethod.geocode ?? {},
                cardId: undefined,
                card: tx.paymentMethod.card
                  ? {
                      connectOrCreate: {
                        where: {
                          id: tx.paymentMethod.card.id,
                        },
                        create: {
                          ...tx.paymentMethod.card,
                          last4: faker.number
                            .int({ min: 1000, max: 9999 })
                            .toString(),
                        },
                      },
                    }
                  : undefined,
              },
            },
          },
          customerId: undefined,
          customer: {
            connectOrCreate: {
              where: {
                id: tx.customerId,
              },
              create: {
                ...tx.customer,
                email: faker.internet.email(),
              },
            },
          },
          outcome: tx.outcome
            ? {
                connectOrCreate: {
                  where: {
                    id: tx.outcome.id,
                  },
                  create: {
                    ...tx.outcome,
                    transactionId: undefined, // do not include transactionId in outcome create input
                  },
                },
              }
            : undefined,
          ruleExecutions: {
            connectOrCreate: tx.ruleExecutions.map((ruleExecution) => ({
              where: {
                id: ruleExecution.id,
              },
              create: {
                ...ruleExecution,
                ruleId: undefined,
                transactionId: undefined,
                rule: {
                  connectOrCreate: {
                    where: {
                      id: ruleExecution.ruleId,
                    },
                    create: ruleExecution.rule,
                  },
                },
              },
            })),
          },
        },
      })
    )
  );
}
main()
  .then(async () => {
    await devPrisma.$disconnect();
    await prodPrisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await devPrisma.$disconnect();
    await prodPrisma.$disconnect();
    process.exit(1);
  });

import {
  type Prisma,
  PrismaClient,
  PaymentOutcomeStatus,
  type Rule,
  type RuleSnapshot,
  type User,
} from "@prisma/client";
import { faker } from "@faker-js/faker";
import { RiskLevel } from "../src/common/types";
import { userAgentFromString } from "next/server";

const devPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.POSTGRES_PRISMA_URL,
    },
  },
});

function selectRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

const NUM_ROWS = 40;
// Generate customers
const PAYMENT_ATTEMPTS: {
  getPaymentAttempt: (props: {
    rules: (Rule & {
      currentRuleSnapshot: RuleSnapshot;
    })[];
    users: User[];
    sessionTypeId: string;
  }) => Prisma.PaymentAttemptCreateArgs["data"];
}[] = Array.from({ length: NUM_ROWS }, () => {
  const name = faker.person.fullName();

  const userAgent = faker.internet.userAgent();
  const userAgentData = userAgentFromString(userAgent);

  return {
    getPaymentAttempt: ({ rules, sessionTypeId, users }) => {
      const ruleExecutions = rules.map(({ currentRuleSnapshot }) => {
        const shouldError = faker.number.int({ min: 0, max: 20 }) > 19;
        const shouldPass = faker.number.int({ min: 0, max: 20 }) > 18;
        return {
          riskLevel: currentRuleSnapshot.riskLevel,
          result: shouldError ? undefined : shouldPass,
          error: shouldError ? faker.lorem.sentence() : undefined,
          ruleSnapshotId: currentRuleSnapshot.id,
        };
      });

      const riskLevelOrder = [
        RiskLevel.Normal,
        RiskLevel.Medium,
        RiskLevel.High,
        RiskLevel.VeryHigh,
      ] as string[];

      const riskLevel = ruleExecutions.reduce((acc, curr) => {
        if (
          riskLevelOrder.indexOf(curr.riskLevel) >
            riskLevelOrder.indexOf(acc) &&
          curr.result === true
        ) {
          return curr.riskLevel;
        }
        return acc;
      }, RiskLevel.Normal as string);

      return {
        amount: faker.number.int({ min: 1, max: 1000000 }),
        currency: "USD",
        description: faker.word.words(2),
        evaluableAction: {
          create: {
            riskLevel: riskLevel,
            ruleExecutions: {
              createMany: {
                data: ruleExecutions,
              },
            },
            session: {
              create: {
                customId: faker.string.uuid(),
                typeId: sessionTypeId,
                userId: selectRandom(users).id,
                deviceSnapshot: {
                  create: {
                    fingerprint: faker.string.nanoid(),
                    userAgent: userAgent,
                    browserName: userAgentData.browser.name,
                    browserVersion: userAgentData.browser.version,
                    deviceModel: userAgentData.device.model,
                    deviceType: userAgentData.device.type,
                    deviceVendor: userAgentData.device.vendor,
                    engineName: userAgentData.engine.name,
                    engineVersion: userAgentData.engine.version,
                    osName: userAgentData.os.name,
                    osVersion: userAgentData.os.version,
                    cpuArchitecture: userAgentData.cpu.architecture,
                    isIncognito: faker.datatype.boolean(),
                    reqUserAgent: userAgent,
                    screenResolution: "1920x1080",
                    timezone: faker.location.timeZone(),
                    ipAddress: {
                      create: {
                        ipAddress: faker.internet.ip(),
                        location: {
                          create: {
                            latitude: faker.location.latitude(),
                            longitude: faker.location.longitude(),
                          },
                        },
                      },
                    },
                    device: {
                      create: {},
                    },
                  },
                },
              },
            },
          },
        },
        paymentMethod: {
          create: {
            customId: faker.string.uuid(),
            name: name,
            address: {
              create: {
                line1: faker.location.streetAddress(),
                line2: faker.location.secondaryAddress(),
                city: faker.location.city(),
                state: faker.location.state(),
                country: faker.location.countryCode(),
                postalCode: faker.location.zipCode(),
                location: {
                  create: {
                    latitude: faker.location.latitude(),
                    longitude: faker.location.longitude(),
                  },
                },
              },
            },
            card: {
              create: {
                fingerprint: faker.string.nanoid(),
                bin: faker.finance.creditCardNumber().slice(0, 6),
                last4: faker.finance.creditCardNumber().slice(-4),
                expiryMonth: faker.number.int({ min: 1, max: 12 }),
                expiryYear: faker.number.int({ min: 2021, max: 2030 }),
                brand: selectRandom(["visa", "mastercard", "amex", "discover"]),
                country: faker.location.countryCode(),
              },
            },
          },
        },
        outcome: {
          create: {
            status: PaymentOutcomeStatus.SUCCEEDED,
            stripeOutcome: {
              create: {
                reason: faker.lorem.sentence(),
              },
            },
          },
        },
      };
    },
  };
});

async function main() {
  const sessionType = await devPrisma.sessionType.create({
    data: {
      name: "Payment",
    },
  });

  const createdUsers = await devPrisma.$transaction(
    Array.from({ length: 10 }).map(() => {
      return devPrisma.user.create({
        data: {
          customId: faker.string.uuid(),
          email: faker.internet.email(),
          name: faker.person.fullName(),
        },
      });
    })
  );

  const createdRules = await devPrisma.$transaction(
    Array.from({ length: 10 }).map(() => {
      return devPrisma.rule.create({
        include: {
          currentRuleSnapshot: true,
        },
        data: {
          sessionTypes: {
            create: {
              sessionTypeId: sessionType.id,
            },
          },
          currentRuleSnapshot: {
            create: {
              name: faker.lorem.word(),
              description: faker.lorem.sentence(),
              jsCode: "function getSignal(input) { return true; }",
              tsCode: "return true;",
              riskLevel: selectRandom([
                RiskLevel.Medium,
                RiskLevel.High,
                RiskLevel.VeryHigh,
              ]),
            },
          },
        },
      });
    })
  );

  // TODO: Set ruleSnapshot's ruleId to the rule created above

  const BATCH_SIZE = 20;
  for (let i = 0; i < PAYMENT_ATTEMPTS.length; i += BATCH_SIZE) {
    const batch = PAYMENT_ATTEMPTS.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(({ getPaymentAttempt }) =>
        devPrisma.$transaction([
          devPrisma.paymentAttempt.create({
            data: getPaymentAttempt({
              users: createdUsers,
              rules: createdRules,
              sessionTypeId: sessionType.id,
            }),
          }),
        ])
      )
    );
  }
}
main()
  .then(async () => {
    await devPrisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await devPrisma.$disconnect();
    process.exit(1);
  });

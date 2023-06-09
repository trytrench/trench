import {
  type Prisma,
  PrismaClient,
  PaymentOutcomeStatus,
} from "@prisma/client";
import { faker } from "@faker-js/faker";
import { RiskLevel } from "../src/common/types";
import { userAgentFromString } from "next/server";

const devPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
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
    deviceSnapshotId: string;
    rules: {
      id: string;
      riskLevel: RiskLevel;
    }[];
  }) => Prisma.PaymentAttemptCreateArgs["data"];
  deviceSnapshot: Prisma.DeviceSnapshotCreateArgs["data"];
}[] = Array.from({ length: NUM_ROWS }, () => {
  const name = faker.person.fullName();

  const userAgent = faker.internet.userAgent();
  const userAgentData = userAgentFromString(userAgent);

  return {
    deviceSnapshot: {
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
      timezone: "America/Los_Angeles",
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
    getPaymentAttempt: ({ deviceSnapshotId, rules }) => {
      const ruleExecutions = rules.map((rule) => {
        const shouldError = faker.number.int({ min: 0, max: 20 }) > 19;
        const shouldPass = faker.number.int({ min: 0, max: 20 }) > 18;
        return {
          riskLevel: rule.riskLevel,
          result: shouldError ? undefined : shouldPass,
          error: shouldError ? faker.lorem.sentence() : undefined,
          ruleId: rule.id,
        };
      });

      const riskLevelOrder = [
        RiskLevel.Normal,
        RiskLevel.Medium,
        RiskLevel.High,
        RiskLevel.VeryHigh,
      ];

      const riskLevel = ruleExecutions.reduce((acc, curr) => {
        if (
          riskLevelOrder.indexOf(curr.riskLevel) >
            riskLevelOrder.indexOf(acc) &&
          curr.result === true
        ) {
          return curr.riskLevel;
        }
        return acc;
      }, RiskLevel.Normal);

      return {
        amount: faker.number.int({ min: 1, max: 1000 }),
        currency: "usd",
        description: faker.word.words(2),

        checkoutSession: {
          create: {
            customId: faker.string.uuid(),
            deviceSnapshot: {
              connect: {
                id: deviceSnapshotId,
              },
            },
            customer: {
              create: {
                customId: faker.string.uuid(),
                email: faker.internet.email(),
                name: name,
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
        assessment: {
          create: {
            riskLevel: riskLevel,
          },
        },
        outcome: {
          create: {
            status: PaymentOutcomeStatus.Succeeded,
            reason: faker.lorem.sentence(),
          },
        },
        ruleExecutions: {
          createMany: {
            data: ruleExecutions,
          },
        },
      };
    },
  };
});

async function main() {
  const ruleIds = Array.from({ length: 10 }, () => faker.string.uuid());
  const rulesToCreate = ruleIds.map((ruleId) => ({
    id: ruleId,
    name: faker.lorem.word(),
    description: faker.lorem.sentence(),
    jsCode: "function getSignal(input) { return true; }",
    tsCode: "return true;",
    riskLevel: selectRandom([
      RiskLevel.Medium,
      RiskLevel.High,
      RiskLevel.VeryHigh,
    ]),
  }));

  await devPrisma.rule.createMany({
    data: rulesToCreate,
  });

  const BATCH_SIZE = 20;
  for (let i = 0; i < PAYMENT_ATTEMPTS.length; i += BATCH_SIZE) {
    const batch = PAYMENT_ATTEMPTS.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(({ getPaymentAttempt, deviceSnapshot }) =>
        devPrisma.$transaction(async (tx) => {
          const snapshot = await devPrisma.deviceSnapshot.create({
            data: deviceSnapshot,
          });
          return devPrisma.paymentAttempt.create({
            data: getPaymentAttempt({
              deviceSnapshotId: snapshot.id,
              rules: rulesToCreate,
            }),
          });
        })
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

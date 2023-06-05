import {
  type Prisma,
  PrismaClient,
  PaymentOutcomeStatus,
} from "@prisma/client";
import { faker } from "@faker-js/faker";
import { RiskLevel } from "../src/common/types";

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

const NUM_ROWS = 200;
// Generate customers
const PAYMENT_ATTEMPTS: Prisma.PaymentAttemptCreateArgs["data"][] = Array.from(
  { length: NUM_ROWS },
  () => {
    return {
      amount: faker.number.int({ min: 1, max: 1000 }),
      currency: "usd",
      description: faker.word.words(2),
      customer: {
        create: {
          customId: faker.string.uuid(),
          email: faker.internet.email(),
          name: faker.person.fullName(),
        },
      },
      checkoutSession: {
        create: {
          customId: faker.string.uuid(),
        },
      },
      paymentMethod: {
        create: {
          customId: faker.string.uuid(),
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
          riskLevel: RiskLevel.Normal,
        },
      },
      outcome: {
        create: {
          status: PaymentOutcomeStatus.Succeeded,
          reason: faker.lorem.sentence(),
        },
      },
    };
  }
);

async function main() {
  await devPrisma.$transaction(
    PAYMENT_ATTEMPTS.map((paymentAttempt) =>
      devPrisma.paymentAttempt.create({ data: paymentAttempt })
    )
  );
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

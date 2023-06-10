import { stream } from "../../flow";
import { type AllCounts, createAllCounts, DEFAULT_ALL_COUNTS } from "./utils";

type CustomerAggregations = {
  cards: AllCounts;
  devices: AllCounts;
  ipAddresses: AllCounts;
  paymentAttempts: AllCounts;
  paymentMethods: AllCounts;
};

export const customerAggregationsStream = stream.resolver(
  async ({ input, ctx }): Promise<CustomerAggregations> => {
    const { paymentAttempt } = input;

    const customerId = paymentAttempt.checkoutSession.customerId;
    const timeOfPayment = new Date(paymentAttempt.createdAt);

    if (!customerId) {
      return {
        cards: DEFAULT_ALL_COUNTS,
        devices: DEFAULT_ALL_COUNTS,
        ipAddresses: DEFAULT_ALL_COUNTS,
        paymentAttempts: DEFAULT_ALL_COUNTS,
        paymentMethods: DEFAULT_ALL_COUNTS,
      };
    }

    const [cardLinks, deviceLinks, ipAddressLinks, paymentAttemptLinks] =
      await ctx.prisma.$transaction([
        ctx.prisma.customerCardLink.findMany({
          where: { customerId: customerId, firstSeen: { lte: timeOfPayment } },
        }),

        ctx.prisma.customerDeviceLink.findMany({
          where: { customerId: customerId, firstSeen: { lte: timeOfPayment } },
        }),

        ctx.prisma.customerIpAddressLink.findMany({
          where: { customerId: customerId, firstSeen: { lte: timeOfPayment } },
        }),

        ctx.prisma.customerPaymentAttemptLink.findMany({
          where: { customerId: customerId, firstSeen: { lte: timeOfPayment } },
        }),

        ctx.prisma.customerPaymentMethodLink.findMany({
          where: { customerId: customerId, firstSeen: { lte: timeOfPayment } },
        }),
      ]);

    return {
      cards: createAllCounts({
        timeOfPayment,
        links: cardLinks,
      }),
      devices: createAllCounts({
        timeOfPayment,
        links: deviceLinks,
      }),
      ipAddresses: createAllCounts({
        timeOfPayment,
        links: ipAddressLinks,
      }),
      paymentAttempts: createAllCounts({
        timeOfPayment,
        links: paymentAttemptLinks,
      }),
      paymentMethods: createAllCounts({
        timeOfPayment,
        links: paymentAttemptLinks,
      }),
    };
  }
);

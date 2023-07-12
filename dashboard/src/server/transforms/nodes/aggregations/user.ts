import { node } from "../../flow";
import { type AllCounts, createAllCounts, DEFAULT_ALL_COUNTS } from "./utils";

type UserAggregations = {
  cards: AllCounts;
  devices: AllCounts;
  ipAddresses: AllCounts;
  paymentAttempts: AllCounts;
  paymentMethods: AllCounts;
};

export const userAggregationsNode = node.resolver(
  async ({ input, ctx }): Promise<UserAggregations> => {
    const { evaluableAction } = input;

    const userId = evaluableAction.session.userId;
    const timeOfPayment = new Date(evaluableAction.createdAt);

    if (!userId) {
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
        ctx.prisma.userCardLink.findMany({
          where: { userId: userId, firstSeen: { lte: timeOfPayment } },
        }),

        ctx.prisma.userDeviceLink.findMany({
          where: { userId: userId, firstSeen: { lte: timeOfPayment } },
        }),

        ctx.prisma.userIpAddressLink.findMany({
          where: { userId: userId, firstSeen: { lte: timeOfPayment } },
        }),

        ctx.prisma.userPaymentAttemptLink.findMany({
          where: { userId: userId, firstSeen: { lte: timeOfPayment } },
        }),

        ctx.prisma.userPaymentMethodLink.findMany({
          where: { userId: userId, firstSeen: { lte: timeOfPayment } },
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

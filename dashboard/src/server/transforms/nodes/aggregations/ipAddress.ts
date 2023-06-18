import { node } from "../../flow";
import {
  DEFAULT_TIME_BUCKET_AGGREGATIONS,
  createTimeBucketCounts,
  type TimeBucketCounts,
  type AllCounts,
  DEFAULT_ALL_COUNTS,
  createAllCounts,
} from "./utils";

type IpAddressAggregations = {
  devices: AllCounts;
  users: AllCounts;
  cards: {
    uniqueCountries: number;
  };
  paymentAttempts: TimeBucketCounts;
};

export const ipAddressAggregationsNode = node.resolver(
  async ({ input, ctx }): Promise<IpAddressAggregations> => {
    const { evaluableAction } = input;

    const ipAddressId = evaluableAction.session.deviceSnapshot?.ipAddressId;
    const timeOfPayment = new Date(evaluableAction.createdAt);

    if (!ipAddressId) {
      return {
        devices: DEFAULT_ALL_COUNTS,
        users: DEFAULT_ALL_COUNTS,
        cards: {
          uniqueCountries: 0,
        },
        paymentAttempts: DEFAULT_TIME_BUCKET_AGGREGATIONS,
      };
    }

    const [userLinks, deviceLinks, uniqueCardCountries, paymentAttemptLinks] =
      await ctx.prisma.$transaction([
        // User links
        ctx.prisma.userIpAddressLink.findMany({
          where: {
            ipAddressId: ipAddressId,
            firstSeen: { lte: timeOfPayment },
          },
        }),
        // Device links
        ctx.prisma.deviceIpAddressLink.findMany({
          where: {
            ipAddressId: ipAddressId,
            firstSeen: { lte: timeOfPayment },
          },
        }),
        // Unique country count
        ctx.prisma.card.findMany({
          select: { id: true },
          distinct: ["country"],
          where: {
            ipAddressLinks: { some: { ipAddressId: ipAddressId } },
            createdAt: { lte: timeOfPayment },
          },
        }),
        // Payment attempt links
        ctx.prisma.paymentAttemptIpAddressLink.findMany({
          where: {
            ipAddressId: ipAddressId,
            paymentAttempt: {
              createdAt: { lte: timeOfPayment },
            },
          },
          include: {
            paymentAttempt: true,
          },
        }),
      ]);

    const userCounts = createAllCounts({
      links: userLinks,
      timeOfPayment,
    });
    const deviceCounts = createAllCounts({
      links: deviceLinks,
      timeOfPayment,
    });

    const paymentCounts = createTimeBucketCounts({
      timeOfPayment,
      items: paymentAttemptLinks.map((link) => ({
        data: link,
        timestamp: new Date(link.paymentAttempt.createdAt),
      })),
    });

    return {
      users: userCounts,
      devices: deviceCounts,
      cards: {
        uniqueCountries: uniqueCardCountries.length,
      },
      paymentAttempts: paymentCounts,
    };
  }
);

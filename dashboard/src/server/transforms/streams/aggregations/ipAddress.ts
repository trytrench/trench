import { stream } from "../../flow";
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
  customers: AllCounts;
  cards: {
    uniqueCountries: number;
  };
  paymentAttempts: TimeBucketCounts;
};

export const ipAddressAggregationsStream = stream.resolver(
  async ({ input, ctx }): Promise<IpAddressAggregations> => {
    const { paymentAttempt } = input;

    const ipAddressId =
      paymentAttempt.checkoutSession.deviceSnapshot?.ipAddressId;
    const timeOfPayment = new Date(paymentAttempt.createdAt);

    if (!ipAddressId) {
      return {
        devices: DEFAULT_ALL_COUNTS,
        customers: DEFAULT_ALL_COUNTS,
        cards: {
          uniqueCountries: 0,
        },
        paymentAttempts: DEFAULT_TIME_BUCKET_AGGREGATIONS,
      };
    }

    const [
      customerLinks,
      deviceLinks,
      uniqueCardCountries,
      paymentAttemptLinks,
    ] = await ctx.prisma.$transaction([
      // Customer links
      ctx.prisma.customerIpAddressLink.findMany({
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

    const customerCounts = createAllCounts({
      links: customerLinks,
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
      customers: customerCounts,
      devices: deviceCounts,
      cards: {
        uniqueCountries: uniqueCardCountries.length,
      },
      paymentAttempts: paymentCounts,
    };
  }
);

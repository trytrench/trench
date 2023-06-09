import { stream } from "../../flow";

type IpAddressAggregations = {
  deviceCount: number;
  uniqueCardCountriesCount: number;
  customerCount: number;
  paymentAttemptCount: number;
};

export const ipAddressAggregationsStream = stream.resolver(
  async ({ input, ctx }): Promise<IpAddressAggregations> => {
    const ipAddress =
      input.paymentAttempt.checkoutSession.deviceSnapshot?.ipAddress?.ipAddress;
    const paymentTime = input.paymentAttempt.createdAt;
    const paymentDate = new Date(paymentTime);

    if (!ipAddress) {
      return {
        deviceCount: 0,
        uniqueCardCountriesCount: 0,
        customerCount: 0,
        paymentAttemptCount: 0,
      };
    }

    const result = await ctx.prisma.$transaction([
      // Device count
      ctx.prisma.device.count({
        where: {
          ipAddressLinks: { some: { ipAddress: { ipAddress: ipAddress } } },
          createdAt: { lte: paymentDate },
        },
      }),
      // Unique country count
      ctx.prisma.card.findMany({
        select: { id: true },
        distinct: ["country"],
        where: {
          ipAddressLinks: { some: { ipAddress: { ipAddress: ipAddress } } },
          createdAt: { lte: paymentDate },
        },
      }),
      // Customer count
      ctx.prisma.customer.count({
        where: {
          ipAddressLinks: { some: { ipAddress: { ipAddress: ipAddress } } },
          createdAt: { lte: paymentDate },
        },
      }),
      // Payment attempt count
      ctx.prisma.paymentAttempt.count({
        where: {
          ipAddressLinks: { some: { ipAddress: { ipAddress: ipAddress } } },
          createdAt: { lte: paymentDate },
        },
      }),
    ]);

    return {
      deviceCount: result[0],
      uniqueCardCountriesCount: result[1].length,
      customerCount: result[2],
      paymentAttemptCount: result[3],
    };
  }
);

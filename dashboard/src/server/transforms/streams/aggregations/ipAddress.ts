import { stream } from "../../flow";

type IpAddressAggregations = {
  deviceCount: number;
  uniqueCardCountriesCount: number;
  customerCount: number;
  paymentAttemptCount: number;
};

export const customerAggregationsStream = stream.resolver(
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
        select: { id: true },
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
        select: { id: true },
        where: {
          ipAddressLinks: { some: { ipAddress: { ipAddress: ipAddress } } },
          createdAt: { lte: paymentDate },
        },
      }),
      // // Payment attempt count
      // ctx.prisma.paymentAttempt.count({
      //     select: { id: true },
      //     where: {
      //         ipa
    ]);

    return {};
  }
);

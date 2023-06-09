import { stream } from "../../flow";

type CustomerAggregations = {
  cardCount: number;
  deviceCount: number;
  ipCount: number;
};

export const customerAggregationsStream = stream.resolver(
  async ({ input, ctx }): Promise<CustomerAggregations> => {
    const customerId = input.paymentAttempt.checkoutSession.customerId;
    const paymentTime = input.paymentAttempt.createdAt;
    const paymentDate = new Date(paymentTime);

    if (!customerId) {
      return {
        cardCount: 0,
        deviceCount: 0,
        ipCount: 0,
      };
    }

    const result = await ctx.prisma.$transaction([
      // Card count
      ctx.prisma.card.count({
        where: {
          customerLinks: { some: { customerId: customerId } },
          createdAt: { lte: paymentDate },
        },
      }),
      // Device count
      ctx.prisma.device.count({
        where: {
          customerLinks: { some: { customerId: customerId } },
          createdAt: { lte: paymentDate },
        },
      }),
      // IP count
      ctx.prisma.ipAddress.count({
        where: {
          customerLinks: { some: { customerId: customerId } },
          createdAt: { lte: paymentDate },
        },
      }),
    ]);

    return {
      cardCount: result[0],
      deviceCount: result[1],
      ipCount: result[2],
    };
  }
);

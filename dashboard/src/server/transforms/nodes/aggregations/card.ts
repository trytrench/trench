import { uniq } from "lodash";
import { node } from "../../flow";
import { geocodePaymentMethodNode } from "../paymentMethodIpDistance";
import { type AllCounts, DEFAULT_ALL_COUNTS, createAllCounts } from "./utils";

type CardAggregations = {
  users: AllCounts;
  uniqueCountries: number;
};

export const cardAggregationsNode = node
  .depend({
    cardGeocode: geocodePaymentMethodNode,
  })
  .resolver(async ({ input, ctx, deps }): Promise<CardAggregations> => {
    const { paymentAttempt } = input.evaluableAction;
    const { cardGeocode } = deps;

    if (!paymentAttempt) {
      throw new Error("No payment attempt data in action");
    }

    const cardId = paymentAttempt.paymentMethod.cardId;
    const timeOfPayment = new Date(paymentAttempt.createdAt);

    if (!cardId) {
      return {
        users: DEFAULT_ALL_COUNTS,
        uniqueCountries: 0,
      };
    }

    const [userLinks, paymentMethods] = await ctx.prisma.$transaction([
      // User count
      ctx.prisma.userCardLink.findMany({
        where: {
          cardId: cardId,
          firstSeen: { lte: new Date(timeOfPayment) },
        },
      }),
      // Payment methods
      ctx.prisma.paymentMethod.findMany({
        where: {
          cardId: cardId,
          createdAt: { lte: new Date(timeOfPayment) },
        },
        include: { address: { include: { location: true } } },
      }),
    ]);

    const pastCountries = paymentMethods
      .map((paymentMethod) => paymentMethod.address?.location?.countryISOCode)
      .filter((countryCode) => !!countryCode) as string[];
    const currentCountry = cardGeocode?.countryCode;
    const uniqueCountries = uniq(
      [...pastCountries, currentCountry]
        .map((code) => code?.trim())
        .filter(Boolean)
    ).length;

    return {
      users: createAllCounts({
        timeOfPayment,
        links: userLinks,
      }),
      uniqueCountries,
    };
  });

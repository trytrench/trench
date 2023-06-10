import { uniq } from "lodash";
import { stream } from "../../flow";
import { geocodeCardStream } from "../cardIpDistance";
import { type AllCounts, DEFAULT_ALL_COUNTS, createAllCounts } from "./utils";

type CardAggregations = {
  customers: AllCounts;
  uniqueCountries: number;
};

export const cardAggregationsStream = stream
  .depend({
    cardGeocode: geocodeCardStream,
  })
  .resolver(async ({ input, ctx, deps }): Promise<CardAggregations> => {
    const { paymentAttempt } = input;
    const { cardGeocode } = deps;

    const cardId = paymentAttempt.paymentMethod.cardId;
    const timeOfPayment = new Date(paymentAttempt.createdAt);

    if (!cardId) {
      return {
        customers: DEFAULT_ALL_COUNTS,
        uniqueCountries: 0,
      };
    }

    const [customerLinks, paymentMethods] = await ctx.prisma.$transaction([
      // Customer count
      ctx.prisma.customerCardLink.findMany({
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
      .map((paymentMethod) => paymentMethod.address?.location?.countryCode)
      .filter((countryCode) => !!countryCode) as string[];
    const currentCountry = cardGeocode.countryCode;
    const uniqueCountries = uniq(
      [...pastCountries, currentCountry].map((code) => code.trim())
    ).length;

    return {
      customers: createAllCounts({
        timeOfPayment,
        links: customerLinks,
      }),
      uniqueCountries,
    };
  });

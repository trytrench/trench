import { stream } from "../../flow";
import { ipDataStream } from "../cardIpDistance";
import { set, mapValues, uniqBy, uniq } from "lodash";

type DeviceAggregations = {
  cityCount: number;
  countryCount: number;
  firstNameCount: number;
};

export const ipAddressAggregationsStream = stream
  .depend({
    geolocateSession: ipDataStream,
  })
  .resolver(async ({ input, deps, ctx }): Promise<DeviceAggregations> => {
    const { geolocateSession } = deps;
    const { paymentAttempt } = input;

    const deviceId = paymentAttempt.checkoutSession.deviceSnapshot?.deviceId;
    const paymentTime = paymentAttempt.createdAt;
    const paymentDate = new Date(paymentTime);

    if (!deviceId) {
      return {
        cityCount: 0,
        countryCount: 0,
        firstNameCount: 0,
      };
    }

    const result = await ctx.prisma.$transaction([
      // All locations
      ctx.prisma.location.findMany({
        where: {
          ipAddresses: {
            some: { deviceLinks: { some: { deviceId: deviceId } } },
          },
        },
      }),
      // First name count
      ctx.prisma.paymentAttempt.findMany({
        include: {
          paymentMethod: true,
        },
        where: {
          checkoutSession: {
            deviceSnapshot: {
              deviceId: deviceId,
            },
          },
        },
      }),
    ]);

    const prevCities = result[0].map((location) => location.cityName);
    const uniqueCities = uniq([
      ...prevCities,
      geolocateSession.cityName,
    ]).filter((x) => !!x) as string[];

    const prevCountries = result[0].map((location) => location.countryCode);
    const uniqueCountries = uniq([
      ...prevCountries,
      geolocateSession.countryISOCode,
    ]).filter((x) => !!x) as string[];

    const prevFirstNames = result[1].map(
      (paymentAttempt) => paymentAttempt.paymentMethod.name?.split(" ")[0]
    );
    const uniqueFirstNames = uniq([
      ...prevFirstNames,
      paymentAttempt.paymentMethod.name?.split(" ")[0],
    ]).filter((x) => !!x) as string[];

    return {
      cityCount: uniqueCities.length,
      countryCount: uniqueCountries.length,
      firstNameCount: uniqueFirstNames.length,
    };
  });

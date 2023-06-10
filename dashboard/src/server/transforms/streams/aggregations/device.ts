import { stream } from "../../flow";
import { ipDataStream } from "../cardIpDistance";
import { uniq } from "lodash";
import {
  type TimeBucketCounts,
  createTimeBucketCounts,
  DEFAULT_TIME_BUCKET_AGGREGATIONS,
  MAX_TIME_INTERVAL_MS,
  type AllCounts,
  DEFAULT_ALL_COUNTS,
  createAllCounts,
} from "./utils";

type DeviceAggregations = {
  uniqueCities: number;
  uniqueCountries: number;
  uniqueFirstNames: number;
  uniqueEmails: TimeBucketCounts;
  customers: AllCounts;
  ipAddresses: AllCounts;
};

export const deviceAggregationsStream = stream
  .depend({
    ipData: ipDataStream,
  })
  .resolver(async ({ input, deps, ctx }): Promise<DeviceAggregations> => {
    const { ipData } = deps;
    const { paymentAttempt } = input;

    const deviceId = paymentAttempt.checkoutSession.deviceSnapshot?.deviceId;
    const timeOfPayment = new Date(paymentAttempt.createdAt);
    const maxIntervalAgo = new Date(
      timeOfPayment.getTime() - MAX_TIME_INTERVAL_MS
    );

    if (!deviceId) {
      return {
        uniqueCities: 0,
        uniqueCountries: 0,
        uniqueFirstNames: 0,
        uniqueEmails: DEFAULT_TIME_BUCKET_AGGREGATIONS,
        customers: DEFAULT_ALL_COUNTS,
        ipAddresses: DEFAULT_ALL_COUNTS,
      };
    }

    ctx.prisma.deviceIpAddressLink;
    const [
      linkedLocations,
      linkedPaymentAttempts,
      customerLinks,
      ipAddressLinks,
    ] = await ctx.prisma.$transaction([
      // All locations
      ctx.prisma.location.findMany({
        where: {
          ipAddresses: {
            some: {
              deviceLinks: {
                some: {
                  deviceId: deviceId,
                  firstSeen: { lte: timeOfPayment },
                },
              },
            },
          },
        },
      }),
      // Get payment attempts and payment methods
      ctx.prisma.paymentAttempt.findMany({
        include: {
          paymentMethod: true,
        },
        where: {
          checkoutSession: {
            deviceSnapshot: {
              deviceId: deviceId,
              createdAt: { lte: timeOfPayment, gte: maxIntervalAgo },
            },
          },
        },
      }),
      // Get associated customers
      ctx.prisma.customerDeviceLink.findMany({
        where: {
          deviceId: deviceId,
          lastSeen: { lte: timeOfPayment, gte: maxIntervalAgo },
        },
        include: {
          customer: true,
        },
      }),
      // Get associated IP addresses
      ctx.prisma.deviceIpAddressLink.findMany({
        where: {
          deviceId: deviceId,
          firstSeen: { lte: timeOfPayment },
        },
      }),
    ]);

    const prevCities = linkedLocations.map((location) => location.cityName);
    const uniqueCities = uniq([...prevCities, ipData.cityName]).filter(
      (x) => !!x
    ) as string[];

    const prevCountries = linkedLocations.map(
      (location) => location.countryCode
    );
    const uniqueCountries = uniq([
      ...prevCountries,
      ipData.countryISOCode,
    ]).filter((x) => !!x) as string[];

    const prevFirstNames = linkedPaymentAttempts.map(
      (paymentAttempt) => paymentAttempt.paymentMethod.name?.split(" ")[0]
    );
    const uniqueFirstNames = uniq([
      ...prevFirstNames,
      paymentAttempt.paymentMethod.name?.split(" ")[0],
    ]).filter((x) => !!x) as string[];

    // Linked emails

    const customerEmails = customerLinks.map((link) => ({
      data: link.customer.email,
      timestamp: link.lastSeen,
    }));
    const paymentMethodEmails = linkedPaymentAttempts.map((paymentAttempt) => ({
      data: paymentAttempt.paymentMethod.email,
      timestamp: paymentAttempt.createdAt,
    }));
    const emailsCount = createTimeBucketCounts({
      timeOfPayment,
      items: [
        ...customerEmails,
        ...paymentMethodEmails,
        {
          data: paymentAttempt.paymentMethod.email,
          timestamp: paymentAttempt.createdAt,
        },
        {
          data: paymentAttempt.checkoutSession.customer?.email,
          timestamp: paymentAttempt.createdAt,
        },
      ],
      getTimeBucketCount(bucketItems) {
        return uniq(bucketItems.map(({ data }) => data)).length;
      },
    });

    return {
      uniqueCities: uniqueCities.length,
      uniqueCountries: uniqueCountries.length,
      uniqueFirstNames: uniqueFirstNames.length,
      uniqueEmails: emailsCount,
      customers: createAllCounts({
        timeOfPayment,
        links: customerLinks,
      }),
      ipAddresses: createAllCounts({
        timeOfPayment,
        links: ipAddressLinks,
      }),
    };
  });

import { node } from "../../flow";
import { ipDataNode } from "../paymentMethodIpDistance";
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
  users: AllCounts;
  ipAddresses: AllCounts;
};

export const deviceAggregationsNode = node
  .depend({
    ipData: ipDataNode,
  })
  .resolver(async ({ input, deps, ctx }): Promise<DeviceAggregations> => {
    const { ipData } = deps;
    const { evaluableAction } = input;

    const deviceId = evaluableAction.session.deviceSnapshot?.deviceId;
    const timeOfPayment = new Date(evaluableAction.createdAt);
    const maxIntervalAgo = new Date(
      timeOfPayment.getTime() - MAX_TIME_INTERVAL_MS
    );

    if (!deviceId) {
      return {
        uniqueCities: 0,
        uniqueCountries: 0,
        uniqueFirstNames: 0,
        uniqueEmails: DEFAULT_TIME_BUCKET_AGGREGATIONS,
        users: DEFAULT_ALL_COUNTS,
        ipAddresses: DEFAULT_ALL_COUNTS,
      };
    }

    ctx.prisma.deviceIpAddressLink;
    const [linkedLocations, linkedPaymentAttempts, userLinks, ipAddressLinks] =
      await ctx.prisma.$transaction([
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
            evaluableAction: {
              session: {
                deviceSnapshot: {
                  deviceId: deviceId,
                  createdAt: { lte: timeOfPayment, gte: maxIntervalAgo },
                },
              },
            },
          },
        }),
        // Get associated users
        ctx.prisma.userDeviceLink.findMany({
          where: {
            deviceId: deviceId,
            lastSeen: { lte: timeOfPayment, gte: maxIntervalAgo },
          },
          include: {
            user: true,
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
      (location) => location.countryISOCode
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
      evaluableAction.paymentAttempt?.paymentMethod.name?.split(" ")[0],
    ]).filter((x) => !!x) as string[];

    // Linked emails

    const userEmails = userLinks.map((link) => ({
      data: link.user.email,
      timestamp: link.lastSeen,
    }));
    const paymentMethodEmails = linkedPaymentAttempts.map((paymentAttempt) => ({
      data: paymentAttempt.paymentMethod.email,
      timestamp: paymentAttempt.createdAt,
    }));

    const emailsCount = createTimeBucketCounts({
      timeOfPayment,
      items: [
        ...userEmails,
        ...paymentMethodEmails,
        {
          data: evaluableAction.paymentAttempt?.paymentMethod.email,
          timestamp: evaluableAction.createdAt,
        },
        {
          data: evaluableAction.session.user?.email,
          timestamp: evaluableAction.createdAt,
        },
      ].filter((item) => !!item.data),
      getTimeBucketCount(bucketItems) {
        return uniq(bucketItems.map(({ data }) => data)).length;
      },
    });

    return {
      uniqueCities: uniqueCities.length,
      uniqueCountries: uniqueCountries.length,
      uniqueFirstNames: uniqueFirstNames.length,
      uniqueEmails: emailsCount,
      users: createAllCounts({
        timeOfPayment,
        links: userLinks,
      }),
      ipAddresses: createAllCounts({
        timeOfPayment,
        links: ipAddressLinks,
      }),
    };
  });

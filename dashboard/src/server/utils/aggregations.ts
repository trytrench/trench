import { Prisma, PrismaPromise } from "@prisma/client";
import { prisma } from "../db";
import { set, mapValues, uniqBy, uniq } from "lodash";
import { zip } from "./zip";

const INTERVALS = {
  _30minutes: {
    interval: "30 minutes",
    ms: 1000 * 60 * 30,
  },
  _1hour: {
    interval: "1 hour",
    ms: 1000 * 60 * 60,
  },
  _3hours: {
    interval: "3 hours",
    ms: 1000 * 60 * 60 * 3,
  },
  _1day: {
    interval: "1 day",
    ms: 1000 * 60 * 60 * 24,
  },
  _1week: {
    interval: "1 week",
    ms: 1000 * 60 * 60 * 24 * 7,
  },
  _1month: {
    interval: "1 month",
    ms: 1000 * 60 * 60 * 24 * 30,
  },
} as const;

type TimeIntervalKey = keyof typeof INTERVALS;
type TimeInterval = (typeof INTERVALS)[TimeIntervalKey]["interval"];

const ONE_WEEK_IN_MS = 1000 * 60 * 60 * 24 * 7;

export const getAggregations = async (
  transactionTime: Date,
  customerId: string,
  ipAddressId: string,
  deviceId: string,
  cardId: string | null
) => {
  /**
   * Inputs
   * - customerId: string,
   * = ipAddressId: string,
   * - deviceId: string
   *
   * List of aggregation queries to make.
   * - num cards of the customer
   * - num wallets of the customer
   * - num devices of the customer
   * - num IPs of the customer
   * - num devices of the IP
   * - num countries of the IP
   * - num customers of the IP
   * - num transactions of the IP
   * - num cities of the device
   * - num countries of the device
   *
   * Time-sensitive aggregation queries (basically, anything transaction related)
   * - num transactions of the customer in the last 30 minutes
   * - num unique payment methods used by the customer in the last 30 minutes
   * - num unique wallets used by the customer in the last 30 minutes
   * - num unique IPs used by the customer in the last 30 minutes
   * - num unique devices used by the customer in the last 30 minutes
   */

  const TX_TIME = transactionTime.getTime();

  type QueryObject<T> = {
    label: string;
    query: PrismaPromise<T>;
    postProcess?: (res: T) => number | Record<TimeIntervalKey, number>;
  };

  function queryObjectHelper<T>(props: QueryObject<T>) {
    return props;
  }

  const queries = [
    queryObjectHelper({
      label: "customerCardCount",
      query: prisma.card.findMany({
        select: { id: true },
        where: {
          paymentMethods: {
            some: {
              transactions: {
                some: {
                  customerId: customerId,
                  createdAt: { lte: new Date(TX_TIME) },
                },
              },
            },
          },
          createdAt: { lte: new Date(TX_TIME) },
        },
      }),
      postProcess: (res) => res.length,
    }),
    queryObjectHelper({
      label: "customerWalletCount",
      query: prisma.transaction.findMany({
        select: { id: true },
        where: {
          customerId: customerId,
          createdAt: { lte: new Date(TX_TIME) },
        },
        distinct: ["walletAddress"],
      }),
      postProcess: (res) => res.length,
    }),
    queryObjectHelper({
      label: "customerDeviceCount",
      query: prisma.device.findMany({
        select: { id: true },
        where: {
          createdAt: { lte: new Date(TX_TIME) },
          sessions: {
            some: {
              transactions: {
                some: {
                  customerId: customerId,
                  createdAt: { lte: new Date(TX_TIME) },
                },
              },
            },
          },
        },
      }),
      postProcess: (res) => res.length,
    }),
    queryObjectHelper({
      label: "customerIpCount",
      query: prisma.ipAddress.findMany({
        where: {
          createdAt: {
            lte: new Date(TX_TIME),
          },
          transactions: {
            some: {
              transaction: {
                customerId: customerId,
                createdAt: { lte: new Date(TX_TIME) },
              },
            },
          },
        },
      }),
      postProcess: (res) => res.length,
    }),
    queryObjectHelper({
      label: "ipDeviceCount",
      query: prisma.device.findMany({
        where: {
          createdAt: { lte: new Date(TX_TIME) },
          ipAddresses: {
            some: { ipAddressId: ipAddressId },
          },
        },
      }),
      postProcess: (res) => res.length,
    }),
    queryObjectHelper({
      label: "ipCardsUniqueCountryCount",
      query: prisma.card.findMany({
        select: { id: true },
        distinct: ["country"],
        where: {
          ipAddresses: {
            some: { ipAddressId: ipAddressId },
          },
          createdAt: { lte: new Date(TX_TIME) },
        },
      }),
      postProcess: (res) => res.length,
    }),
    queryObjectHelper({
      label: "ipCustomerCount",
      query: prisma.customer.findMany({
        where: {
          createdAt: { lte: new Date(TX_TIME) },
          ipAddresses: {
            some: { ipAddressId: ipAddressId },
          },
        },
      }),
      postProcess: (res) => res.length,
    }),
    queryObjectHelper({
      label: "ipTransactionCount",
      query: prisma.transaction.findMany({
        where: {
          createdAt: {
            lte: new Date(TX_TIME),
          },
          ipAddresses: {
            some: { ipAddressId: ipAddressId },
          },
        },
      }),
      postProcess: (res) => res.length,
    }),
    queryObjectHelper({
      label: "deviceCityCount",
      query: prisma.ipAddress.findMany({
        distinct: ["cityGeonameId"],
        where: {
          createdAt: { lte: new Date(TX_TIME) },
          devices: { some: { deviceId: deviceId } },
        },
        select: { cityGeonameId: true },
      }),
      postProcess: (res) => res.length,
    }),
    queryObjectHelper({
      label: "deviceCountryCount",
      query: prisma.ipAddress.findMany({
        distinct: ["countryISOCode"],
        where: {
          createdAt: { lte: new Date(TX_TIME) },
          devices: { some: { deviceId: deviceId } },
        },
        select: { cityGeonameId: true },
      }),
      postProcess: (res) => res.length,
    }),
    queryObjectHelper({
      label: "cardCustomerCount",
      query: prisma.customer.findMany({
        where: {
          cards: { some: { cardId: cardId ?? "" } },
          createdAt: { lte: new Date(TX_TIME) },
        },
      }),
      postProcess: (res) => res.length,
    }),
    queryObjectHelper({
      label: "deviceFirstNamesCount",
      query: prisma.transaction.findMany({
        include: {
          paymentMethod: true,
        },
        where: {
          createdAt: { lte: new Date(TX_TIME) },
          session: { deviceId: deviceId },
        },
      }),
      postProcess: (res) => {
        const firstNames = res
          .map((tx) => tx.paymentMethod.name?.split(" ")[0] ?? "")
          .filter((name) => name.length > 0);
        return uniq(firstNames).length;
      },
    }),

    // TIME SENSITIVE QUERIES BELOW
    queryObjectHelper({
      label: "emailsLinkedToDeviceCount",
      query: prisma.customer.findMany({
        where: {
          createdAt: {
            gte: new Date(TX_TIME - ONE_WEEK_IN_MS),
            lte: new Date(TX_TIME),
          },
          transactions: {
            some: { session: { deviceId: deviceId } },
          },
        },
        distinct: ["email"],
      }),
      postProcess: (res) => {
        return mapValues(INTERVALS, (interval) => {
          const cutoff = new Date(TX_TIME - interval.ms);
          return res.filter((customer) => customer.createdAt >= cutoff).length;
        });
      },
    }),
    queryObjectHelper({
      label: "customerCardsCreatedCount",
      query: prisma.card.findMany({
        select: {
          createdAt: true,
        },
        where: {
          createdAt: {
            gte: new Date(TX_TIME - ONE_WEEK_IN_MS),
            lte: new Date(TX_TIME),
          },
          customers: {
            some: { customerId: customerId },
          },
        },
      }),
      postProcess: (cards) => {
        return mapValues(INTERVALS, (interval) => {
          const cutoff = new Date(TX_TIME - interval.ms);
          return cards.filter((card) => card.createdAt >= cutoff).length;
        });
      },
    }),
    queryObjectHelper({
      label: "ipCustomerCreatedCount",
      query: prisma.customer.findMany({
        select: {
          createdAt: true,
        },
        where: {
          createdAt: {
            gte: new Date(TX_TIME - ONE_WEEK_IN_MS),
            lte: new Date(TX_TIME),
          },
          ipAddresses: {
            some: { ipAddressId: ipAddressId },
          },
        },
      }),
      postProcess: (customers) => {
        return mapValues(INTERVALS, (interval) => {
          const cutoff = new Date(TX_TIME - interval.ms);
          return customers.filter((customer) => customer.createdAt >= cutoff)
            .length;
        });
      },
    }),

    queryObjectHelper({
      label: "customerTransactionCount",
      query: prisma.transaction.findMany({
        select: {
          createdAt: true,
        },
        where: {
          customerId: customerId,
          createdAt: {
            gte: new Date(TX_TIME - ONE_WEEK_IN_MS),
            lte: new Date(TX_TIME),
          },
        },
      }),
      postProcess: (txs) => {
        return mapValues(INTERVALS, (interval) => {
          const cutoff = new Date(TX_TIME - interval.ms);
          return txs.filter((tx) => tx.createdAt >= cutoff).length;
        });
      },
    }),
    queryObjectHelper({
      label: "customerPaymentMethodsUsedCount",
      query: prisma.transaction.findMany({
        select: {
          createdAt: true,
        },
        where: {
          customerId: customerId,
          createdAt: {
            gte: new Date(TX_TIME - ONE_WEEK_IN_MS),
            lte: new Date(TX_TIME),
          },
        },
        distinct: ["paymentMethodId"],
        orderBy: { createdAt: "desc" },
      }),
      postProcess: (txs) => {
        return mapValues(INTERVALS, (interval) => {
          const cutoff = new Date(TX_TIME - interval.ms);
          return txs.filter((tx) => tx.createdAt >= cutoff).length;
        });
      },
    }),

    queryObjectHelper({
      label: "customerWalletsUsedCount",
      query: prisma.transaction.findMany({
        select: {
          createdAt: true,
        },
        where: {
          customerId: customerId,
          createdAt: {
            gte: new Date(TX_TIME - ONE_WEEK_IN_MS),
            lte: new Date(TX_TIME),
          },
        },
        distinct: ["walletAddress"],
        orderBy: { createdAt: "desc" },
      }),
      postProcess: (txs) => {
        return mapValues(INTERVALS, (interval) => {
          const cutoff = new Date(TX_TIME - interval.ms);
          return txs.filter((tx) => tx.createdAt >= cutoff).length;
        });
      },
    }),

    queryObjectHelper({
      label: "customerIpsUsedCount",
      query: prisma.transaction.findMany({
        where: {
          customerId: customerId,
          createdAt: {
            gte: new Date(TX_TIME - ONE_WEEK_IN_MS),
            lte: new Date(TX_TIME),
          },
        },
        include: {
          ipAddresses: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      postProcess: (txs) => {
        const ipAddressUsedTimes = txs.flatMap((tx) => {
          return tx.ipAddresses.map((ip) => {
            return {
              ipAddressId: ip.ipAddressId,
              usedTime: tx.createdAt,
            };
          });
        });
        const ipAddressUsedTimesUniq = uniqBy(
          ipAddressUsedTimes,
          (ip) => ip.ipAddressId
        );
        return mapValues(INTERVALS, (interval) => {
          const cutoff = new Date(TX_TIME - interval.ms);
          return ipAddressUsedTimesUniq.filter((obj) => obj.usedTime >= cutoff)
            .length;
        });
      },
    }),
    queryObjectHelper({
      label: "customerDevicesUsedCount",
      query: prisma.transaction.findMany({
        where: {
          customerId: customerId,
          createdAt: {
            gte: new Date(TX_TIME - ONE_WEEK_IN_MS),
            lte: new Date(TX_TIME),
          },
        },
        include: {
          session: { include: { device: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      postProcess: (txs) => {
        const txsUniqDevices = uniqBy(txs, (tx) => tx.session.deviceId);
        return mapValues(INTERVALS, (interval) => {
          const cutoff = new Date(TX_TIME - interval.ms);
          return txsUniqDevices.filter((tx) => tx.createdAt >= cutoff).length;
        });
      },
    }),
  ];

  // const results = await Promise.all(queries.map((query) => query.query));

  const prismaQueries = queries.map((query) => query.query);

  const results = await prisma.$transaction(prismaQueries, {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadUncommitted, // optional, default defined by database configuration
  });

  const zipped = zip(queries, results);

  const aggregations = zipped.map(([query, result]) => {
    if (!result) return null;
    if (!query.postProcess) return null;
    // @ts-ignore
    const processed = query.postProcess(result);
    return {
      key: query.label,
      value: processed,
    };
  });

  // change to map
  const aggregationMap = aggregations.reduce((acc, aggregation) => {
    if (!aggregation) return acc;
    if (!aggregation.value) return acc;
    acc[aggregation.key] = aggregation.value;
    return acc;
  }, {} as Record<string, number | Record<TimeIntervalKey, number>>);

  return aggregationMap;
};

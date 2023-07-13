import { PRISMA_TYPES } from "./prismaTypes";

export const PREFIX = `
function getSignal(input: RuleInput): boolean {
`.trim();

export const SUFFIX = `
}
`.trim();

const TRENCH_TYPES = `
type TimeBucketCounts = {
  _30minutes: number;
  _1hour: number;
  _3hours: number;
  _1day: number;
  _1week: number;
  _1month: number;
}

type AllCounts = {
  newSeen: TimeBucketCounts;
  totalSeen: TimeBucketCounts;
  allTimeTotal: number;
};


type CardAggregations = {
  users: AllCounts;
  uniqueCountries: number;
};

type DeviceAggregations = {
  uniqueCities: number;
  uniqueCountries: number;
  uniqueFirstNames: number;
  uniqueEmails: TimeBucketCounts;
  users: AllCounts;
  ipAddresses: AllCounts;
};

type UserAggregations = {
  cards: AllCounts;
  devices: AllCounts;
  ipAddresses: AllCounts;
  paymentAttempts: AllCounts;
  paymentMethods: AllCounts;
};

type IpAddressAggregations = {
  devices: AllCounts;
  users: AllCounts;
  cards: {
    uniqueCountries: number;
  };
  paymentAttempts: TimeBucketCounts;
};

type RuleInput = {
  evaluableAction: EvaluableAction & {
    session: Session & {
      deviceSnapshot:
        | (DeviceSnapshot & {
            device: Device;
            ipAddress:
              | (IpAddress & {
                  location: Location | null;
                })
              | null;
          })
        | null;
      user: User | null;
    };
    paymentAttempt:
      | (PaymentAttempt & {
          paymentMethod: PaymentMethod & {
            address: Address | null;
            card: Card | null;
          };
        })
      | null;
    kycAttempt: KycAttempt | null;
  };
  lists: Record<string, string[]>;
  transforms: {
    aggregations: {
      card: CardAggregations;
      device: DeviceAggregations;
      user: UserAggregations;
      ipAddresses: IpAddressAggregations;
    };
    paymentMethodIpDistance: {
      value: number;
      unit: string;
    };
    ethWalletInfo: {
      ethBalance: number;
      outgoingTxCount: number;
    };
    isUnregisteredGmail: boolean;
  };
};

`.trim();

export const TYPES_SOURCE = `
${PRISMA_TYPES}

${TRENCH_TYPES}
`.trim();

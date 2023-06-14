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
  customers: AllCounts;
  uniqueCountries: number;
};

type DeviceAggregations = {
  uniqueCities: number;
  uniqueCountries: number;
  uniqueFirstNames: number;
  uniqueEmails: TimeBucketCounts;
  customers: AllCounts;
  ipAddresses: AllCounts;
};

type CustomerAggregations = {
  cards: AllCounts;
  devices: AllCounts;
  ipAddresses: AllCounts;
  paymentAttempts: AllCounts;
  paymentMethods: AllCounts;
};

type IpAddressAggregations = {
  devices: AllCounts;
  customers: AllCounts;
  cards: {
    uniqueCountries: number;
  };
  paymentAttempts: TimeBucketCounts;
};

type RuleInput = {
  paymentAttempt: PaymentAttempt & {
    checkoutSession: CheckoutSession & {
      deviceSnapshot: DeviceSnapshot & { device: Device; ipAddress: IpAddress };
      customer: Customer;
    };
    paymentMethod: PaymentMethod & { address: Address; card: Card };
  };
  lists: List[];
  transforms: {
    aggregations: {
      card: CardAggregations;
      device: DeviceAggregations;
      customer: CustomerAggregations;
      ipAddresses: IpAddressAggregations;
    };
  };
};

`.trim();

export const TYPES_SOURCE = `
${PRISMA_TYPES}

${TRENCH_TYPES}
`.trim();

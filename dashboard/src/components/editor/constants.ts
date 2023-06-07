export const PREFIX = `
type GetSignalInput = {
  transaction: Tx;
  lists: Lists;
  aggregations: Aggregations;
}

function getSignal(input: GetSignalInput): boolean {
`.trim();

export const SUFFIX = `
}
`.trim();

export const TYPES_SOURCE = `
/**
 * From https://github.com/sindresorhus/type-fest/
 * Matches a JSON object.
 * This type can be useful to enforce some input to be JSON-compatible or as a super-type to be extended from. 
 */
type JsonObject = {[Key in string]?: JsonValue}

/**
 * From https://github.com/sindresorhus/type-fest/
 * Matches a JSON array.
 */
interface JsonArray extends Array<JsonValue> {}

/**
 * From https://github.com/sindresorhus/type-fest/
 * Matches any valid JSON value.
 */
type JsonValue = string | number | boolean | JsonObject | JsonArray | null

/**
 * Model Session
 * 
 */
type Session = {
  id: string
  updatedAt: Date
  createdAt: Date
  externalId: string
  deviceId: string
  ipAddressId: string
}

/**
 * Model Device
 * 
 */
type Device = {
  id: string
  updatedAt: Date
  createdAt: Date
  components: {
    fonts: JsonValue
    domBlockers: JsonValue
    fontPreferences: JsonValue
    audio: JsonValue
    screenFrame: JsonValue
    osCpu: JsonValue
    languages: JsonValue
    colorDepth: JsonValue
    deviceMemory: JsonValue
    screenResolution: JsonValue
    hardwareConcurrency: JsonValue
    timezone: JsonValue
    sessionStorage: JsonValue
    localStorage: JsonValue
    indexedDB: JsonValue
    openDatabase: JsonValue
    cpuClass: JsonValue
    platform: JsonValue
    plugins: JsonValue
    canvas: JsonValue
    touchSupport: JsonValue
    vendor: JsonValue
    vendorFlavors: JsonValue
    cookiesEnabled: JsonValue
    colorGamut: JsonValue
    invertedColors: JsonValue
    forcedColors: JsonValue
    monochrome: JsonValue
    contrast: JsonValue
    reducedMotion: JsonValue
    hdr: JsonValue
    math: JsonValue
    videoCard: JsonValue
    pdfViewerEnabled: JsonValue
    architecture: JsonValue
  }
}

/**
 * Model IpAddress
 * 
 */
type IpAddress = {
  id: string
  updatedAt: Date
  createdAt: Date
  ipAddress: string
  continentISOCode: string | null
  continentName: string | null
  countryISOCode: string | null
  countryName: string | null
  countryConfidence: number | null
  cityGeonameId: number | null
  cityName: string | null
  cityConfidence: number | null
  postalCode: string | null
  postalConfidence: number | null
  subdivisionISOCode: string | null
  subdivisionName: string | null
  subdivisionConfidence: number | null
  latitude: number | null
  longitude: number | null
  accuracyRadius: number | null
  averageIncome: number | null
  timezone: string | null
  isp: string | null
  isAnonymous: boolean | null
  isAnonymousVpn: boolean | null
  isHostingProvider: boolean | null
  isLegitimateProxy: boolean | null
  isPublicProxy: boolean | null
  isResidentialProxy: boolean | null
  isTorExitNode: boolean | null
  staticIPScore: number | null
  userCount: number | null
  userType: string | null
}

/**
 * Model PaymentMethod
 * 
 */
type PaymentMethod = {
  id: string
  updatedAt: Date
  createdAt: Date
  externalId: string
  name: string | null
  email: string | null
  city: string | null
  country: string | null
  line1: string | null
  line2: string | null
  postalCode: string | null
  state: string | null
  cardId: string | null
}

/**
 * Model Card
 * 
 */
type Card = {
  id: string
  updatedAt: Date
  createdAt: Date
  bin: string | null
  brand: string
  country: string
  last4: string
  fingerprint: string
  funding: string | null
  issuer: string | null
  wallet: string | null
  threeDSecureSupported: boolean | null
  cvcCheckResult: string | null
}

/**
 * Model Transaction
 * 
 */
type Transaction = {
  id: string
  updatedAt: Date
  createdAt: Date
  amount: number
  currency: string
  quantity: number
  walletAddress: string
  sellerId: string
  sessionId: string
  paymentMethodId: string
  customerId: string
}

/**
 * Model TransactionOutcome
 * 
 */
type TransactionOutcome = {
  id: string
  updatedAt: Date
  createdAt: Date
  status: string
  networkStatus: string | null
  reason: string | null
  riskLevel: string | null
  riskScore: number | null
  sellerMessage: string | null
  type: string | null
  transactionId: string
}

/**
 * Model Customer
 * 
 */
type Customer = {
  id: string
  updatedAt: Date
  createdAt: Date
  email: string
  externalId: string
}

/**
 * Model CustomerDevice
 * 
 */
type CustomerDevice = {
  createdAt: Date
  customerId: string
  deviceId: string
}

/**
 * Model CustomerCard
 * 
 */
type CustomerCard = {
  createdAt: Date
  customerId: string
  cardId: string
}

/**
 * Model CustomerIpAddress
 * 
 */
type CustomerIpAddress = {
  createdAt: Date
  customerId: string
  ipAddressId: string
}

/**
 * Model CustomerTransaction
 * 
 */
type CustomerTransaction = {
  createdAt: Date
  customerId: string
  transactionId: string
}

/**
 * Model TransactionIpAddress
 * 
 */
type TransactionIpAddress = {
  createdAt: Date
  transactionId: string
  ipAddressId: string
}

/**
 * Model DeviceIpAddress
 * 
 */
type DeviceIpAddress = {
  createdAt: Date
  deviceId: string
  ipAddressId: string
}

/**
 * Model CardIpAddress
 * 
 */
type CardIpAddress = {
  createdAt: Date
  cardId: string
  ipAddressId: string
}


/// Trench Types

type Tx = Transaction & {
  session: Session & {
    transactions: Transaction[];
    device: Device;
    ipAddress: IpAddress;
  }
  paymentMethod: PaymentMethod & {
    card: Card | null;
  }
  customer: Customer;
}

type AggregationIntervals = {
  _30minutes: number
  _1hour: number
  _3hours: number
  _1day: number
  _1week: number
  _1month: number
}

type Aggregations = {
  customerCardCount: number
  customerWalletCount: number
  customerDeviceCount: number
  customerIpCount: number
  ipDeviceCount: number
  ipCountryCount: number
  ipCustomerCount: number
  ipTransactionCount: number
  deviceCityCount: number
  deviceCountryCount: number
  cardCustomerCount: number
  deviceFirstNamesCount: number
  emailsLinkedToDeviceCount: AggregationIntervals
  customerCardsCreatedCount: AggregationIntervals
  ipCustomerCreatedCount: AggregationIntervals
  customerTransactionCount: AggregationIntervals
  customerPaymentMethodsUsedCount: AggregationIntervals
  customerWalletsUsedCount: AggregationIntervals
  customerIpsUsedCount: AggregationIntervals
  customerDevicesUsedCount: AggregationIntervals
}
`.trim();

export const PRISMA_TYPES = `
/**
 * Model PaymentAttempt
 * 
 */
type PaymentAttempt = {
  id: string
  createdAt: Date
  updatedAt: Date
  amount: number
  currency: string
  description: string | null
  metadata: Prisma.JsonValue
  checkoutSessionId: string
  paymentMethodId: string
  shippingName: string | null
  shippingPhone: string | null
  shippingAddressId: string | null
}

/**
 * Model PaymentAttemptAssessment
 * 
 */
type PaymentAttemptAssessment = {
  id: string
  createdAt: Date
  updatedAt: Date
  transformsOutput: Prisma.JsonValue
  isFraud: boolean
  riskLevel: string
  paymentAttemptId: string
}

/**
 * Model PaymentOutcome
 * 
 */
type PaymentOutcome = {
  id: string
  customId: string | null
  createdAt: Date
  updatedAt: Date
  status: PaymentOutcomeStatus
  threeDSecureFlow: string | null
  threeDSecureResult: string | null
  threeDSecureResultReason: string | null
  threeDSecureVersion: string | null
  paymentAttemptId: string
}

/**
 * Model StripePaymentOutcome
 * 
 */
type StripePaymentOutcome = {
  id: string
  createdAt: Date
  updatedAt: Date
  networkStatus: string | null
  reason: string | null
  riskLevel: string | null
  riskScore: number | null
  rule: Prisma.JsonValue | null
  sellerMessage: string | null
  type: string | null
  paymentOutcomeId: string
}

/**
 * Model Customer
 * 
 */
type Customer = {
  id: string
  customId: string
  createdAt: Date
  updatedAt: Date
  name: string | null
  email: string | null
  phone: string | null
  metadata: Prisma.JsonValue
}

/**
 * Model CheckoutSession
 * 
 */
type CheckoutSession = {
  id: string
  customId: string | null
  createdAt: Date
  updatedAt: Date
  customerId: string | null
}

/**
 * Model Event
 * 
 */
type Event = {
  id: string
  createdAt: Date
  updatedAt: Date
  type: string
  payload: Prisma.JsonValue
  checkoutSessionId: string
}

/**
 * Model DeviceSnapshot
 * 
 */
type DeviceSnapshot = {
  id: string
  createdAt: Date
  updatedAt: Date
  deviceId: string
  ipAddressId: string | null
  checkoutSessionId: string
  fingerprint: string | null
  userAgent: string | null
  browserName: string | null
  browserVersion: string | null
  deviceModel: string | null
  deviceType: string | null
  deviceVendor: string | null
  engineName: string | null
  engineVersion: string | null
  osName: string | null
  osVersion: string | null
  cpuArchitecture: string | null
  isIncognito: boolean | null
  reqUserAgent: string | null
  screenResolution: string | null
  timezone: string | null
  metadata: Prisma.JsonValue
}

/**
 * Model Device
 * 
 */
type Device = {
  id: string
  updatedAt: Date
  createdAt: Date
}

/**
 * Model PaymentMethod
 * 
 */
type PaymentMethod = {
  id: string
  customId: string | null
  updatedAt: Date
  createdAt: Date
  name: string | null
  email: string | null
  addressId: string | null
  cvcCheck: string | null
  addressLine1Check: string | null
  postalCodeCheck: string | null
  cardId: string | null
  cardWallet: string | null
}

/**
 * Model Card
 * 
 */
type Card = {
  id: string
  fingerprint: string
  updatedAt: Date
  createdAt: Date
  bin: string | null
  brand: string
  country: string | null
  last4: string
  funding: string | null
  issuer: string | null
  expiryMonth: number | null
  expiryYear: number | null
  threeDSecureSupported: boolean | null
}

/**
 * Model Location
 * 
 */
type Location = {
  id: string
  latitude: number | null
  longitude: number | null
  cityGeonameId: number | null
  cityName: string | null
  countryISOCode: string | null
  countryName: string | null
  postalCode: string | null
  regionISOCode: string | null
  regionName: string | null
}

/**
 * Model IpAddress
 * 
 */
type IpAddress = {
  id: string
  ipAddress: string
  createdAt: Date
  updatedAt: Date
  locationId: string | null
  metadata: Prisma.JsonValue
}

/**
 * Model Address
 * 
 */
type Address = {
  id: string
  city: string | null
  country: string | null
  line1: string | null
  line2: string | null
  postalCode: string | null
  state: string | null
  locationId: string | null
}

/**
 * Model Rule
 * 
 */
type Rule = {
  id: string
  updatedAt: Date
  createdAt: Date
  name: string
  description: string | null
  tsCode: string
  jsCode: string
  riskLevel: string
}

/**
 * Model RuleExecution
 * 
 */
type RuleExecution = {
  id: string
  createdAt: Date
  paymentAttemptId: string
  ruleId: string
  result: boolean | null
  error: string | null
  riskLevel: string
}

/**
 * Model List
 * 
 */
type List = {
  id: string
  updatedAt: Date
  createdAt: Date
  name: string
  alias: string
  regex: string | null
  createdBy: string
}

/**
 * Model ListItem
 * 
 */
type ListItem = {
  id: string
  updatedAt: Date
  createdAt: Date
  value: string
  listId: string
  createdBy: string
}

/**
 * Model CustomerPaymentMethodLink
 * 
 */
type CustomerPaymentMethodLink = {
  customerId: string
  paymentMethodId: string
  firstSeen: Date
  lastSeen: Date
}

/**
 * Model CustomerPaymentAttemptLink
 * 
 */
type CustomerPaymentAttemptLink = {
  customerId: string
  paymentAttemptId: string
  firstSeen: Date
  lastSeen: Date
}

/**
 * Model CustomerDeviceLink
 * 
 */
type CustomerDeviceLink = {
  customerId: string
  deviceId: string
  firstSeen: Date
  lastSeen: Date
}

/**
 * Model CustomerCardLink
 * 
 */
type CustomerCardLink = {
  customerId: string
  cardId: string
  firstSeen: Date
  lastSeen: Date
}

/**
 * Model CustomerIpAddressLink
 * 
 */
type CustomerIpAddressLink = {
  customerId: string
  ipAddressId: string
  firstSeen: Date
  lastSeen: Date
}

/**
 * Model PaymentAttemptIpAddressLink
 * 
 */
type PaymentAttemptIpAddressLink = {
  paymentAttemptId: string
  ipAddressId: string
}

/**
 * Model DeviceIpAddressLink
 * 
 */
type DeviceIpAddressLink = {
  deviceId: string
  ipAddressId: string
  firstSeen: Date
  lastSeen: Date
}

/**
 * Model CardIpAddressLink
 * 
 */
type CardIpAddressLink = {
  createdAt: Date
  cardId: string
  ipAddressId: string
  firstSeen: Date
  lastSeen: Date
}


/**
 * Enums
 */

type PaymentOutcomeStatus = "SUCCEEDED" | "FAILED" | "PENDING"


namespace Prisma {

  /**
   * Prisma Client JS version: 4.15.0
   * Query Engine version: 8fbc245156db7124f997f4cecdd8d1219e360944
   */
  type PrismaVersion = {
    client: string
  }

  /**
   * Utility Types
   */

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
   * Matches a JSON object.
   * Unlike \`JsonObject\`, this type allows undefined and read-only properties.
   */
  type InputJsonObject = {readonly [Key in string]?: InputJsonValue | null}

  /**
   * Matches a JSON array.
   * Unlike \`JsonArray\`, readonly arrays are assignable to this type.
   */
  interface InputJsonArray extends ReadonlyArray<InputJsonValue | null> {}

  /**
   * Matches any valid value that can be used as an input for operations like
   * create and update as the value of a JSON field. Unlike \`JsonValue\`, this
   * type allows read-only arrays and read-only object properties and disallows
   * \`null\` at the top level.
   *
   * \`null\` cannot be used as the value of a JSON field because its meaning
   * would be ambiguous. Use \`Prisma.JsonNull\` to store the JSON null value or
   * \`Prisma.DbNull\` to clear the JSON value and set the field to the database
   * NULL value instead.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-by-null-values
   */
  type InputJsonValue = string | number | boolean | InputJsonObject | InputJsonArray
}
  
`.trim();

export enum RiskLevel {
  VeryHigh = "very_high",
  High = "high",
  Medium = "medium",
  Low = "low",
}

export enum EvaluableActionType {
  PaymentAttempt = "PaymentAttempt",
}

export enum UserFlow {
  StripePayment = "StripePayment",
  SellerKyc = "SellerKyc",
}

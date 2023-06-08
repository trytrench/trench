import {
  type Card,
  type CheckoutSession,
  type Customer,
  type Device,
  type DeviceSnapshot,
  type IpAddress,
  type PaymentAttempt,
  type PaymentMethod,
} from "@prisma/client";
import { RiskLevel } from "../../common/types";

export type RulePayload = {
  paymentAttempt: PaymentAttempt & {
    checkoutSession: CheckoutSession & {
      deviceSnapshot:
        | (DeviceSnapshot & {
            ipAddress: IpAddress;
            device: Device;
          })
        | null;
      paymentAttempts: PaymentAttempt[];
    };
    paymentMethod: PaymentMethod & { card: Card | null };
    customer: Customer | null;
  };
  transforms: any;
  lists: Record<string, string[]>;
};

function convertStringToFn(jsString: string) {
  if (jsString === "" || jsString === null) {
    throw new Error("No string supplied");
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-implied-eval
  return Function(`"use strict";return (${jsString})`)();
}

export function runRule({
  rule,
  payload,
}: {
  rule: {
    jsCode: string;
    riskLevel: string;
  };
  payload: RulePayload;
}) {
  try {
    const fn = convertStringToFn(rule.jsCode) as unknown as (
      props: any
    ) => boolean;
    const result = fn(payload);
    return {
      result,
      riskLevel: rule.riskLevel as RiskLevel,
    };
  } catch (e: any) {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      error: e?.message ?? "Unknown error",
      riskLevel: rule.riskLevel as RiskLevel,
    };
  }
}

export function runRules({
  rules,
  payload,
}: {
  rules: { jsCode: string; riskLevel: string }[];
  payload: RulePayload;
}) {
  const ruleExecutionResults = rules.map((rule) => runRule({ rule, payload }));

  const severitiesOrder = [
    RiskLevel.VeryHigh,
    RiskLevel.High,
    RiskLevel.Medium,
    RiskLevel.Normal,
  ];
  const firedRules = ruleExecutionResults.filter(
    (result) => result?.result === true
  );
  const highestRiskLevel = firedRules.reduce((prev, curr) => {
    const prevIndex = severitiesOrder.indexOf(prev);
    const currIndex = severitiesOrder.indexOf(curr.riskLevel);
    return currIndex < prevIndex ? curr.riskLevel : prev;
  }, RiskLevel.Normal as RiskLevel);

  return { ruleExecutionResults, highestRiskLevel };
}

import { rules } from ".eslintrc.cjs";
import {
  Card,
  Customer,
  Device,
  IpAddress,
  PaymentMethod,
  Prisma,
  RiskLevel,
  Rule,
  Session,
  Transaction,
} from "@prisma/client";

export type PayloadTransaction = Transaction & {
  session: Session & {
    device: Device;
    ipAddress: IpAddress;
    transactions: Transaction[];
  };
  paymentMethod: PaymentMethod & { card: Card | null };
  customer: Customer;
};

function convertStringToFn(jsString: string) {
  if (jsString === "" || jsString === null) {
    throw new Error("No string supplied");
  }
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
  payload: {
    transaction: PayloadTransaction;
    aggregations: any;
    lists: Record<string, string[]>;
  };
}) {
  try {
    const fn = convertStringToFn(rule.jsCode) as unknown as (
      props: any
    ) => boolean;
    const result = fn(payload);
    return {
      result,
      riskLevel: rule.riskLevel,
    };
  } catch (e: any) {
    return {
      error: e.message ?? "Unknown error",
      riskLevel: rule.riskLevel,
    };
  }
}

export function runRules({
  rules,
  payload,
}: {
  rules: { jsCode: string; riskLevel: string }[];
  payload: {
    transaction: PayloadTransaction;
    aggregations: any;
    lists: Record<string, string[]>;
  };
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

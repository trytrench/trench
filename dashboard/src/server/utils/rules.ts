import {
  type Card,
  type Session,
  type User,
  type Device,
  type DeviceSnapshot,
  type IpAddress,
  type PaymentAttempt,
  type PaymentMethod,
} from "@prisma/client";
import { RiskLevel } from "../../common/types";
import { type RuleInput } from "../transforms/ruleInput";

function convertStringToFn(jsString: string) {
  if (jsString === "" || jsString === null) {
    throw new Error("No string supplied");
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-implied-eval
  return Function(`"use strict";return (${jsString})`)();
}

export function runRule({
  rule,
  input,
}: {
  rule: {
    jsCode: string;
    riskLevel: string;
  };
  input: RuleInput;
}) {
  try {
    const fn = convertStringToFn(rule.jsCode) as unknown as (
      props: any
    ) => boolean;
    const result = fn(input);
    return {
      result,
      riskLevel: rule.riskLevel as RiskLevel,
      error: null,
    };
  } catch (e: unknown) {
    const error = e as Error;
    return {
      result: null,
      error: error?.message || "Unknown error",
      riskLevel: rule.riskLevel as RiskLevel,
    };
  }
}

export function runRules({
  rules,
  input,
}: {
  rules: { jsCode: string; riskLevel: string }[];
  input: RuleInput;
}) {
  const ruleExecutionResults = rules.map((rule) => runRule({ rule, input }));

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

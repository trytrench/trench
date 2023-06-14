import { node } from "./flow";
import { aggregationNode } from "./nodes/aggregations";
import { type inferNodeOutput } from "@trytrench/flow";

export const splitNameNode = node.resolver(({ input }) => {
  const { paymentAttempt } = input;
  const nameArr = paymentAttempt.paymentMethod.name?.split(" ") || [];
  const firstName = nameArr[0];
  const lastName = nameArr.slice(1).join(" ");
  return {
    firstName,
    lastName,
  };
});

export const ruleInputNode = node
  .depend({
    transforms: {
      aggregations: aggregationNode,
      splitName: splitNameNode,
    },
  })
  .resolver(({ input, deps }) => {
    const { paymentAttempt, blockLists } = input;
    const { transforms } = deps;
    return {
      paymentAttempt: paymentAttempt,
      lists: blockLists,
      transforms,
    };
  });

export type RuleInput = inferNodeOutput<typeof ruleInputNode>;

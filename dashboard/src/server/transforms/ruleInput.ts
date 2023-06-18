import { node } from "./flow";
import { aggregationNode } from "./nodes/aggregations";
import { type inferNodeOutput } from "@trytrench/flow";
import {
  paymentMethodIpDistanceNode,
  geocodePaymentMethodNode,
  ipDataNode,
} from "./nodes/paymentMethodIpDistance";

export const ruleInputNode = node
  .depend({
    transforms: {
      aggregations: aggregationNode,
      ipData: ipDataNode,
      paymentMethodLocation: geocodePaymentMethodNode,
      paymentMethodIpDistance: paymentMethodIpDistanceNode,
    },
  })
  .resolver(({ input, deps }) => {
    const { evaluableAction, blockLists } = input;
    const { transforms } = deps;
    return {
      evaluableAction,
      lists: blockLists,
      transforms,
    };
  });

export type RuleInput = inferNodeOutput<typeof ruleInputNode>;

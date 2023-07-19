import { node } from "./flow";
import { type inferNodeOutput } from "@trytrench/flow";
import { ipDataNode } from "./nodes/paymentMethodIpDistance";
import {
  geocodeKycAddressNode,
  kycIpDistanceNode,
} from "./nodes/kycIpDistance";

export const kycTransforms = node
  .depend({
    transforms: {
      ipData: ipDataNode,
      kycLocation: geocodeKycAddressNode,
      kycIpDistance: kycIpDistanceNode,
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

export type KycTransformInput = inferNodeOutput<typeof kycTransforms>;

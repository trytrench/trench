import { node } from "../../flow";
import { cardAggregationsNode } from "./card";
import { userAggregationsNode } from "./user";
import { deviceAggregationsNode } from "./device";
import { ipAddressAggregationsNode } from "./ipAddress";

export const aggregationNode = node
  .depend({
    card: cardAggregationsNode,
    device: deviceAggregationsNode,
    user: userAggregationsNode,
    ipAddresses: ipAddressAggregationsNode,
  })
  .resolver(({ deps }) => {
    return deps;
  });

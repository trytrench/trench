import { node } from "../../flow";
import { cardAggregationsNode } from "./card";
import { customerAggregationsNode } from "./customer";
import { deviceAggregationsNode } from "./device";
import { ipAddressAggregationsNode } from "./ipAddress";

export const aggregationNode = node
  .depend({
    card: cardAggregationsNode,
    device: deviceAggregationsNode,
    customer: customerAggregationsNode,
    ipAddresses: ipAddressAggregationsNode,
  })
  .resolver(({ deps }) => {
    return deps;
  });

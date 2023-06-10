import { stream } from "../../flow";
import { cardAggregationsStream } from "./card";
import { customerAggregationsStream } from "./customer";
import { deviceAggregationsStream } from "./device";
import { ipAddressAggregationsStream } from "./ipAddress";

export const aggregationStream = stream
  .depend({
    card: cardAggregationsStream,
    device: deviceAggregationsStream,
    customer: customerAggregationsStream,
    ipAddresses: ipAddressAggregationsStream,
  })
  .resolver(({ deps }) => {
    return deps;
  });

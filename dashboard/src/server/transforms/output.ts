import { cardIpDistanceStream } from "./streams/cardIpDistance";
import { stream } from "./flow";
import { aggregationStream } from "./streams/aggregations";

export const rulePayloadStream = stream
  .depend({
    transforms: {
      aggregations: aggregationStream,
      cardIpDistance: cardIpDistanceStream,
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

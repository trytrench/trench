import { cardIpDistanceStream } from "./streams/cardIpDistance";
import { stream } from "./flow";

export const transformsStream = stream.depend({}).resolver(({ deps }) => {
  return {
    transforms: deps,
  };
});

export const rulePayloadStream = stream.depend({}).resolver(({ input }) => {
  const { paymentAttempt, blockLists } = input;

  return {
    paymentAttempt: paymentAttempt,
    lists: blockLists,
    transforms: {
      cardIpDistance: cardIpDistanceStream,
    },
  };
});

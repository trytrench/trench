import { node } from "./flow";
import { aggregationNode } from "./nodes/aggregations";
import { type inferNodeOutput } from "@trytrench/flow";
import {
  paymentMethodIpDistanceNode,
  geocodePaymentMethodNode,
  ipDataNode,
} from "./nodes/paymentMethodIpDistance";
import { getEthWalletInfo } from "./plugins/getEthWalletInfo";
import { isGmailRegistered } from "./plugins/isGmailRegistered";

export const ethWalletInfoNode = node
  .resolver(({ input }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const metadata = input.evaluableAction.paymentAttempt?.metadata as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const walletAddress = metadata?.walletAddress as string | undefined;
    if (!walletAddress) {
      throw new Error("Wallet address not found");
    }
    return walletAddress;
  })
  .then(getEthWalletInfo);

export const isUnregisteredGmailNode = node.resolver(async ({ input }) => {
  const email = input.evaluableAction.session.user?.email;

  // Return false if ending is not @gmail
  if (!email || !email.endsWith("@gmail.com")) {
    return false;
  }

  const isRegisteredGmail = await isGmailRegistered(email);
  return !isRegisteredGmail;
});

export const ruleInputNode = node
  .depend({
    transforms: {
      aggregations: aggregationNode,
      ipData: ipDataNode,
      paymentMethodLocation: geocodePaymentMethodNode,
      paymentMethodIpDistance: paymentMethodIpDistanceNode,
      ethWalletInfo: ethWalletInfoNode,
      isUnregisteredGmail: isUnregisteredGmailNode,
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

import { Network, Alchemy, Utils } from "alchemy-sdk";
import { env } from "../../../env.mjs";

const settings = {
  apiKey: env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(settings);

export async function getEthWalletInfo(address: string) {
  const outgoingTxCount = await alchemy.core.getTransactionCount(address);

  const balance = await alchemy.core.getBalance(address);

  const result = {
    ethBalance: parseFloat(Utils.formatEther(balance)),
    outgoingTxCount,
  };

  return result;
}

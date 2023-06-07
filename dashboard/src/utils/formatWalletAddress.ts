export const formatWalletAddress = (walletAddress: string) => {
  return walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4);
};

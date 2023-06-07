export enum DefaultBlockListAlias {
  IpBlocklist = "ipBlocklist",
  EmailBlocklist = "emailBlocklist",
  CardFingerprintBlocklist = "cardFingerprintBlocklist",
  WalletAddressBlocklist = "walletAddressBlocklist",
  DeviceBlocklist = "deviceBlocklist",
}

export const DEFAULT_BLOCKLISTS: Record<
  DefaultBlockListAlias,
  { name: string }
> = {
  [DefaultBlockListAlias.IpBlocklist]: {
    name: "IP Blocklist",
  },
  [DefaultBlockListAlias.EmailBlocklist]: {
    name: "Email Blocklist",
  },
  [DefaultBlockListAlias.CardFingerprintBlocklist]: {
    name: "Card Fingerprint Blocklist",
  },
  [DefaultBlockListAlias.WalletAddressBlocklist]: {
    name: "Wallet Address Blocklist",
  },
  [DefaultBlockListAlias.DeviceBlocklist]: {
    name: "Device Blocklist",
  },
} as const;

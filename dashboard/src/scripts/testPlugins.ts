import "dotenv/config";
import { getEthWalletInfo } from "../server/transforms/plugins/getEthWalletInfo";
import { isGmailRegistered } from "../server/transforms/plugins/isGmailRegistered";

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

async function main() {
  const address = "0xe688b84b23f322a994a53dbf8e15fa82cdb71127";
  console.log("Info for address: ", address);
  console.log(await getEthWalletInfo(address));

  const legitEmail = "chengmaxwu@gmail.com";
  console.log("Is gmail registered: ", legitEmail);
  console.log(await isGmailRegistered(legitEmail));

  const notLegitEmail = "asdfoiasdjfoisadjfoiasdfj@gmail.com";
  console.log("Is gmail registered: ", notLegitEmail);
  console.log(await isGmailRegistered(notLegitEmail));
}

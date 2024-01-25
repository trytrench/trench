import { useRouter } from "next/router";
import SettingsLayout from "~/components/SettingsLayout";
import { type NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";

const Page: NextPageWithLayout = () => {
  const router = useRouter();

  return <div className="grow overflow-y-auto"></div>;
};

Page.getLayout = (page) => <SettingsLayout>{page}</SettingsLayout>;

export default Page;

import AppLayout from "~/components/AppLayout";
import { EntityList } from "~/components/EntityList";
import type { NextPageWithLayout } from "~/pages/_app";

const Page: NextPageWithLayout = () => {
  return <EntityList />;
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

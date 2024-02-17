import { useRouter } from "next/router";
import { useMemo } from "react";
import AppLayout from "~/components/AppLayout";
import EventsList from "~/components/EventsList";
import type { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";

const Page: NextPageWithLayout = () => {
  return <EventsList />;
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

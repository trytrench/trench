import { useRouter } from "next/router";
import { useMemo } from "react";
import AppLayout from "~/components/AppLayout";
import EventsList from "~/components/EventsList";
import type { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";

const Page: NextPageWithLayout = () => {
  const router = useRouter();

  return (
    <div className="h-full flex items-stretch">
      <div className="flex-1 w-full flex flex-col items-stretch">
        <EventsList />
      </div>
    </div>
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

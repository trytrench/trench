import { useRouter } from "next/router";
import { useMemo } from "react";
import AppLayout from "~/components/AppLayout";
import EventsList from "~/components/EventsList";
import type { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";

const Page: NextPageWithLayout = () => {
  const router = useRouter();

  const { data: project } = api.project.getByName.useQuery(
    { name: router.query.project as string },
    { enabled: !!router.query.project }
  );
  const datasetId = useMemo(
    () => project?.prodDatasetId?.toString(),
    [project]
  );

  return (
    <div className="flex-1 overflow-hidden flex items-stretch">
      <div className="flex-1 w-full flex flex-col items-stretch">
        <div className="relative flex-1">
          <EventsList datasetId={datasetId} />
        </div>
      </div>
    </div>
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

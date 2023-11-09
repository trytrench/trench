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
  const datasetId = project?.productionDatasetId;

  console.log(project);
  if (!datasetId) return null;

  return (
    <div className="h-full flex items-stretch">
      <div className="flex-1 w-full flex flex-col items-stretch">
        {project && <EventsList datasetId={datasetId} projectId={project.id} />}
      </div>
    </div>
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

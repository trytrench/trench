import { Navbar } from "~/components/Navbar";
import { DatasetEditor } from "~/components/DatasetEditor";
import { useRouter } from "next/router";
import { api } from "~/utils/api";

const Page = () => {
  const router = useRouter();
  const datasetId = router.query.datasetId as string | undefined;

  const { data: dataset } = api.datasets.get.useQuery(
    { id: datasetId! },
    { enabled: !!datasetId }
  );

  if (!dataset) return null;
  return (
    <>
      <Navbar />
      <DatasetEditor files={dataset.rules} />
    </>
  );
};

export default Page;

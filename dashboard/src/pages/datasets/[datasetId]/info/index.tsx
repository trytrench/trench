import { Navbar } from "~/components/Navbar";
import { DatasetEditor } from "~/components/DatasetEditor";
import { useRouter } from "next/router";

const Page = () => {
  const router = useRouter();
  const datasetId = router.query.datasetId as string | undefined;
  return (
    <>
      <Navbar />
      <DatasetEditor datasetId={datasetId ?? null} readonly={true} />
    </>
  );
};

export default Page;

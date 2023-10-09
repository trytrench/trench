import { useRouter } from "next/router";
import { DatasetEditor } from "../components/DatasetEditor";
import { Navbar } from "../components/Navbar";
import { api } from "../utils/api";
import { useCallback } from "react";

function CreatePage() {
  const router = useRouter();
  const forkFrom = router.query.forkFrom as string | undefined;

  return (
    <>
      <Navbar />
      <DatasetEditor datasetId={forkFrom ?? null} />
    </>
  );
}

export default CreatePage;

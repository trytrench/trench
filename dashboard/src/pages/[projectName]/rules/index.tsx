import { Navbar } from "~/components/Navbar";
import { DatasetEditor } from "~/components/DatasetEditor";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import { Button, Icon } from "@chakra-ui/react";
import { Tag } from "lucide-react";
import type { NextPageWithLayout } from "~/pages/_app";
import AppLayout from "~/components/AppLayout";
import { useEffect, useMemo, useState } from "react";
import { Release } from "@prisma/client";

const Page: NextPageWithLayout = () => {
  const router = useRouter();

  const { data: project } = api.project.getByName.useQuery(
    { name: router.query.projectName as string },
    { enabled: !!router.query.projectName }
  );
  const datasetId = useMemo(
    () => project?.prodDatasetId?.toString(),
    [project]
  );

  const { data: dataset } = api.datasets.get.useQuery(
    { id: datasetId! },
    { enabled: !!datasetId }
  );

  const [currentRelease, setCurrentRelease] = useState<Release | null>(null);

  useEffect(() => {
    if (dataset) setCurrentRelease(dataset.release);
  }, [dataset]);

  if (!currentRelease) return null;
  return (
    <DatasetEditor
      release={currentRelease}
      onPreviewRelease={setCurrentRelease}
      key={currentRelease.id}
    />
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

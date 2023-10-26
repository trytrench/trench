import { Version } from "@prisma/client";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "~/components/AppLayout";
import { RuleEditor } from "~/components/RuleEditor";
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

  const { data: dataset } = api.datasets.get.useQuery(
    { id: datasetId! },
    { enabled: !!datasetId }
  );

  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);

  useEffect(() => {
    if (dataset) setCurrentVersion(dataset.release);
  }, [dataset]);

  if (!currentVersion) return null;
  return (
    <RuleEditor
      release={currentVersion}
      onPreviewRelease={setCurrentVersion}
      key={currentVersion.id}
    />
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

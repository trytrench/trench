import { EventHandler } from "@prisma/client";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "~/components/AppLayout";
import { EventHandlerEditor } from "~/components/EventHandlerEditor";
// import { Navbar } from "~/components/Navbar";
// import { RuleEditor } from "~/components/RuleEditor";
// import { Toaster } from "~/components/ui/toaster";
import type { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";

const Page: NextPageWithLayout = () => {
  const router = useRouter();

  const { data: project } = api.project.getByName.useQuery(
    { name: router.query.project as string },
    { enabled: !!router.query.project }
  );
  const datasetId = useMemo(() => project?.productionDatasetId, [project]);

  const { data: dataset } = api.datasets.get.useQuery(
    { id: datasetId! },
    { enabled: !!datasetId }
  );

  const [currentEventHandler, setCurrentEventHandler] =
    useState<EventHandler | null>(null);

  useEffect(() => {
    const eventHandler = dataset?.currentEventHandlerAssignment?.eventHandler;
    if (eventHandler) {
      setCurrentEventHandler(eventHandler);
    }
  }, [dataset]);

  if (!currentEventHandler) return null;
  return (
    <div className="h-full w-full">
      <EventHandlerEditor
        initialValue={currentEventHandler}
        key={currentEventHandler.id}
      />
    </div>
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

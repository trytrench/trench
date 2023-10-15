import { Title } from "@tremor/react";
import { useRouter } from "next/router";
import AppLayout from "~/components/AppLayout";
import EventsList from "~/components/EventsList";
import { Filter, useFilters } from "~/components/Filter";
import { Navbar } from "~/components/Navbar";
import type { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";

const Page: NextPageWithLayout = () => {
  const router = useRouter();
  const datasetId = router.query.datasetId as string;

  const { type, features, labels, sortBy } = useFilters();

  const { data: eventTypes, isLoading: eventTypesLoading } =
    api.labels.getEventTypes.useQuery({ datasetId }, { enabled: !!datasetId });

  const { data: eventLabels, isLoading: eventLabelsLoading } =
    api.labels.getEventLabels.useQuery(
      {
        eventType: type ?? undefined,
        datasetId,
      },
      { enabled: !!datasetId }
    );

  const { data: eventFeatures, isLoading: eventFeaturesLoading } =
    api.labels.getEventFeatures.useQuery(
      {
        eventType: type ?? undefined,
        datasetId,
      },
      { enabled: !!datasetId }
    );

  return (
    <div className="flex-1 overflow-hidden flex items-stretch">
      <div className="flex-1 w-full flex flex-col items-stretch">
        {/* heading? */}
        <div className="relative flex-1">
          <EventsList datasetId={router.query.datasetId as string} />
        </div>
      </div>
    </div>
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

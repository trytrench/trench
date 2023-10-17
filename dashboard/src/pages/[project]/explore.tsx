import EntitiesDashboard from "~/components/EntitiesDashboard";
import EventsDashboard from "~/components/EventsDashboard";
import { type NextPageWithLayout } from "../_app";
import AppLayout from "~/components/AppLayout";
import { DatePickerWithRange } from "~/components/DatePickerWithRange";
import { useMemo, useState } from "react";
import { type DateRange } from "react-day-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useRouter } from "next/router";
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

  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  return (
    <div>
      <div className="px-8 flex items-center gap-4 py-4">
        <DatePickerWithRange
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </div>
      <div className="h-4"></div>

      <div className="px-8">
        <Tabs>
          <TabsList>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="entities">Entities</TabsTrigger>
          </TabsList>

          {dateRange && (
            <>
              <TabsContent value="events">
                <EventsDashboard datasetId={datasetId} dateRange={dateRange} />
              </TabsContent>
              <TabsContent value="entities">
                <EntitiesDashboard dateRange={dateRange} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

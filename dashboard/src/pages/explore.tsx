import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { type DateRange } from "react-day-picker";
import AppLayout from "~/components/AppLayout";
import { DatePickerWithRange } from "~/components/DatePickerWithRange";
import EntitiesDashboard from "~/components/EntitiesDashboard";
import EventsDashboard from "~/components/EventsDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/utils/api";
import { type NextPageWithLayout } from "../_app";

const Page: NextPageWithLayout = () => {
  const router = useRouter();

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
                <EventsDashboard dateRange={dateRange} />
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

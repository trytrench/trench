// unused

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@tremor/react";
import { DateParam, useQueryParams } from "use-query-params";
import { DateRangePicker } from "~/components/DateRangePicker";
import EntitiesDashboard from "~/components/EntitiesDashboard";
import EventsDashboard from "~/components/EventsDashboard";
import { Navbar } from "../components/Navbar";

function EventsPage() {
  const [dateRange, setDateRange] = useQueryParams({
    from: DateParam,
    to: DateParam,
  });

  return (
    <div>
      <div className="px-8 flex items-center gap-4 py-4">
        <DateRangePicker
          value={dateRange}
          onValueChange={(value) => setDateRange(value)}
        />
      </div>
      <div className="h-4"></div>

      <div className="px-8">
        <TabGroup>
          <TabList>
            <Tab>Events</Tab>
            <Tab>Entities</Tab>
          </TabList>
          <TabPanels>
            <TabPanel className="pb-40">
              <EventsDashboard />
            </TabPanel>
            <TabPanel>
              <EntitiesDashboard />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </div>
  );
}
export default function Dashboard() {
  return (
    <>
      <Navbar />
      <EventsPage />
    </>
  );
}

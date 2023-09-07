import { format } from "date-fns";
import { api } from "../utils/api";
import {
  DateRangePicker,
  EntityLabelFilter,
  EntityTypeFilter,
  EventLabelFilter,
  EventTypeFilter,
  useEventFilters,
} from "../components/Filters";
import {
  Box,
  HStack,
  Heading,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Navbar } from "../components/Navbar";
import { TopList } from "../components/TopList";
import {
  ArrayParam,
  NumberParam,
  StringParam,
  useQueryParam,
} from "use-query-params";
import { EntityTimeChart } from "../components/EntityTimeChart";
import { EventTimeChart } from "../components/EventTimeChart";
import { EventLabelDistribution } from "../components/EventLabelDistribution";
import { EntityLabelDistribution } from "../components/EntityLabelDistribution";
import { useEffect } from "react";
import { Metric, Title } from "@tremor/react";

function EntitiesPage() {
  const { data: entityLabels } = api.labels.getEntityLabels.useQuery();
  const { data: entityTypes } = api.labels.getEntityTypes.useQuery();

  const [entityType] = useQueryParam("entityType", StringParam);
  const eventFilters = useEventFilters();
  const [paramEntityLabels] = useQueryParam("entityLabel", ArrayParam);

  return (
    <div className="p-8 bg-gray-50 flex flex-col gap-8">
      {entityTypes?.map((entityType, idx) => {
        return (
          <div key={idx}>
            <Metric>Entity: {entityType.name}</Metric>
            <div className="h-4"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-4">
                <EntityLabelDistribution
                  title={`Labels of ${
                    entityType ? `\`${entityType.name}\`` : "entities"
                  }`}
                  entityFilters={{
                    entityType: entityType.id,
                  }}
                />
                <TopList
                  title={`${
                    entityType ? `\`${entityType.name}\`` : "Entities"
                  } with most ${
                    eventFilters.eventType
                      ? `\`${eventFilters.eventType}\` `
                      : ""
                  }events`}
                  entityTitle={entityType.name ?? ""}
                  countTitle={"Events"}
                  args={{
                    limit: 5,
                    entityFilters: {
                      entityType: entityType.id,
                    },
                  }}
                />
              </div>
              <div className="col-span-2">
                {!paramEntityLabels?.length && (
                  <EntityTimeChart
                    title={`Unique ${
                      entityType ? `\`${entityType.name}\`` : "entities"
                    }`}
                    color="neutral"
                    entityFilters={{
                      entityType: entityType.id,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventsPage() {
  const filters = useEventFilters();

  const { data: eventTypes } = api.labels.getEventTypes.useQuery();

  return (
    <>
      <div className="bg-gray-50 p-8 flex flex-col gap-8">
        {eventTypes?.map((eventType, idx) => {
          return (
            <div key={idx}>
              <Metric>Event: {eventType.name}</Metric>
              <div className="h-4"></div>
              <div className="grid grid-cols-3 gap-4">
                <VStack>
                  <EventLabelDistribution
                    title="Event Labels"
                    eventFilters={{
                      eventType: eventType.id,
                    }}
                  />
                </VStack>
                <div className="col-span-2">
                  <EventTimeChart
                    title="All Events"
                    color="neutral"
                    eventFilters={{
                      eventType: eventType.id,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
export default function Dashboard() {
  const filters = useEventFilters();

  const startDateString = filters.dateRange?.start
    ? format(new Date(filters.dateRange.start), "M/d")
    : undefined;
  const endDateString = filters.dateRange?.end
    ? format(new Date(filters.dateRange.end), "M/d")
    : undefined;

  const [tab, setTab] = useQueryParam("tab", NumberParam);
  const [entityType, setEntityType] = useQueryParam("entityType", StringParam);
  const [eventType, setEventType] = useQueryParam("eventType", StringParam);
  const [eventLabels, setEventLabels] = useQueryParam("eventLabel", ArrayParam);
  const [entityLabels, setEntityLabels] = useQueryParam(
    "entityLabel",
    ArrayParam
  );
  useEffect(() => {
    if (tab === 0) {
      setEntityType(undefined);
      setEntityLabels(undefined);
    }
  }, [setEntityType, setEntityLabels, tab]);

  return (
    <div>
      <Navbar />
      <div className="p-4 gap-8 flex justify-start items-end">
        <Metric>
          <b>
            {startDateString} - {endDateString},{" "}
          </b>
          <span className="">
            {eventType ? `\`${eventType}\` events` : "all events"}
            {eventLabels?.length
              ? ` with labels: ${eventLabels
                  .map((label) => `\`${label}\``)
                  .join(", ")}`
              : ""}
            {entityType || entityLabels?.length
              ? `, related to ${entityType ? `\`${entityType}\`` : "entities"}`
              : ""}
            {entityLabels?.length
              ? ` with labels: ${entityLabels
                  .map((label) => `\`${label}\``)
                  .join(", ")}`
              : ""}
          </span>
        </Metric>
      </div>
      <div className="px-4 pb-4 flex gap-4">
        <DateRangePicker />
      </div>

      <Tabs isLazy index={tab ?? 0} onChange={setTab}>
        <TabList px={4}>
          <Tab>Events</Tab>
          <Tab>Entities</Tab>
        </TabList>
        <TabPanels>
          <TabPanel p={0}>
            <EventsPage />
          </TabPanel>
          <TabPanel p={0}>
            <EntitiesPage />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}

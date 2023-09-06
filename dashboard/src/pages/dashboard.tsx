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

  const [entityType] = useQueryParam("entityType", StringParam);
  const eventFilters = useEventFilters();
  const [paramEntityLabels] = useQueryParam("entityLabel", ArrayParam);

  return (
    <div className="p-4 bg-gray-50">
      <div className="flex gap-4 items-baseline">
        <div className="bg-white shadow-md rounded-md">
          <EventTypeFilter />
        </div>
        <span>related to</span>
        <div className="bg-white shadow-md rounded-md">
          <EntityTypeFilter />
        </div>
      </div>
      <div className="h-4"></div>
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-4">
          <TopList
            title={`${
              entityType ? `\`${entityType}\`` : "Entities"
            } with most ${
              eventFilters.eventType ? `\`${eventFilters.eventType}\` ` : ""
            }events`}
            entityTitle={entityType ?? ""}
            countTitle={"Events"}
            args={{
              limit: 10,
            }}
          />
          <EntityLabelDistribution
            title={`Labels of ${entityType ? `\`${entityType}\`` : "entities"}`}
            entityFilters={{
              entityType: entityType ?? "",
            }}
          />
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-4">
          {!paramEntityLabels?.length && (
            <EntityTimeChart
              title={`Unique ${entityType ? `\`${entityType}\`` : "entities"}`}
              color="neutral"
            />
          )}

          {entityLabels?.map((label) => {
            if (
              paramEntityLabels?.length > 0 &&
              !paramEntityLabels?.includes(label.id)
            ) {
              return null;
            }
            return (
              <EntityTimeChart
                key={label.id}
                title={`Unique ${
                  entityType ? `\`${entityType}\`` : "entities"
                } with label: \`${label.name}\``}
                entityFilters={{
                  entityLabels: [label.id],
                }}
                color={label.color === "orange" ? "amber" : label.color}
              />
            );
          })}
        </div>
      </div>
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

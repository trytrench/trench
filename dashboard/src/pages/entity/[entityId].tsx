import { Stack, Tag } from "@chakra-ui/react";
import {
  Badge,
  Card,
  Divider,
  Icon,
  List,
  ListItem,
  Metric,
  Select,
  SelectItem,
  Tab,
  TabGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TabList,
  TabPanel,
  TabPanels,
  Text,
  Title,
} from "@tremor/react";

import { differenceInMinutes, format, formatRelative } from "date-fns";
import { enUS } from "date-fns/locale";
import {
  AlignJustify,
  AlignJustifyIcon,
  Cable,
  CableIcon,
  FileQuestion,
  LayoutGrid,
  Link,
  ListIcon,
  LogIn,
} from "lucide-react";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { NumberParam, useQueryParam, useQueryParams } from "use-query-params";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { DateRangePicker } from "~/components/DateRangePicker";
import { api, type RouterOutputs } from "~/utils/api";
import { DateParam } from "~/utils/DateParam";
import { EventCard } from "../../components/EventCard";
import { EventDrawer } from "../../components/EventDrawer";
import { EventLabelDistribution } from "../../components/EventLabelDistribution";
import { EventListItem } from "../../components/EventListItem";
import { EntityEventChart } from "../../components/EventTimeChart";
import { Navbar } from "../../components/Navbar";
import LinksView from "~/components/LinksView";
import LinksDisplay from "~/components/LinksView/refactor";

function HorzScroll({ children }: { children: React.ReactNode }) {
  return (
    <ScrollArea.Root>
      <ScrollArea.Viewport>{children}</ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        orientation="horizontal"
        className="flex select-none touch-none p-0.5 bg-black/20 transition-colors duration-[160ms] ease-out hover:bg-blackA8 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2"
      >
        <ScrollArea.Thumb className="flex-1 bg-white/50 rounded-[10px] relative" />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner />
    </ScrollArea.Root>
  );
}

function RenderEvents({
  entityId,
  view,
}: {
  entityId?: string;
  view: "list" | "grid";
}) {
  const { data } = api.lists.getEventsList.useQuery({
    limit: 50,
    eventFilters: {
      entityId,
      // dateRange: {
      //   from: dateRange.from.getTime(),
      //   to: dateRange.to.getTime(),
      // },
    },
  });

  const [selectedEvent, setSelectedEvent] = useState<
    RouterOutputs["lists"]["getEventsList"]["rows"][number] | null
  >(null);

  return (
    <Stack spacing={2}>
      {data?.rows.map((event) =>
        view === "list" ? (
          <EventListItem
            key={event.id}
            event={event}
            onClick={() => {
              setSelectedEvent(event);
            }}
            selected={selectedEvent?.id === event.id}
          />
        ) : (
          <EventCard key={event.id} event={event} />
        )
      )}
      {selectedEvent && (
        <EventDrawer
          selectedEvent={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => {
            setSelectedEvent(null);
          }}
        />
      )}
    </Stack>
  );
}

function RelatedEntities({ entityId }: { entityId?: string }) {
  const [entityType, setEntityType] = useState<string>("");
  const [entityLabel, setEntityLabel] = useState<string | undefined>(undefined);

  const { data } = api.entities.findRelatedEntities.useQuery({
    id: entityId ?? "",
    entityType: entityType,
    entityLabel: entityLabel,
  });

  const { data: entityTypes } = api.labels.getEntityTypes.useQuery();
  const { data: entityLabels } = api.labels.getEntityLabels.useQuery({
    entityType: entityType,
  });

  return (
    <>
      <div className="flex items-center gap-4 grow">
        <Text className="whitespace-nowrap">Filter</Text>
        <Select
          enableClear
          className="w-40"
          value={entityType}
          onValueChange={setEntityType}
          placeholder="All entities"
        >
          {entityTypes?.map((et) => (
            <SelectItem key={et} value={et}>
              {et}
            </SelectItem>
          )) ?? []}
        </Select>
        <Text className="whitespace-nowrap">with label</Text>
        <Select
          enableClear
          className="w-40"
          value={entityLabel}
          onValueChange={setEntityLabel}
          placeholder="All labels"
        >
          {entityLabels?.map((el) => (
            <SelectItem key={el} value={el}>
              {el}
            </SelectItem>
          )) ?? []}
        </Select>
      </div>
      <Divider className="mb-0 mt-4" />
      <LinksDisplay
        entityId={entityId ?? ""}
        entityFilter={{
          entityType,
        }}
        onEntityFilterChange={setEntityType}
      />
    </>
  );
}

const TODAY = new Date();

export default function Home() {
  const { data: labelsData } = api.labels.getAllLabels.useQuery();

  const router = useRouter();
  const entityId = router.query.entityId as string | undefined;

  const { data: entityData } = api.entities.get.useQuery(
    { id: entityId! },
    { enabled: !!entityId }
  );

  const entityInfo = useMemo(
    () =>
      entityData
        ? {
            Type: entityData.type,
            Name: entityData.name,
            ID: entityData.id,
            // "First Seen": format(entityData.firstSeen, "yyyy-MM-dd HH:mm:ss"),
            // "Last Seen": format(entityData.lastSeen, "yyyy-MM-dd HH:mm:ss"),
          }
        : {},
    [entityData]
  );

  const [tab, setTab] = useQueryParam("tab", NumberParam);
  const [view, setView] = useState<"grid" | "list">("list");

  const [dateRange, setDateRange] = useQueryParams({
    from: DateParam,
    to: DateParam,
  });

  return (
    <>
      <Navbar />

      <main className="flex-1 h-0 flex flex-col">
        <div className="px-9 py-4 border-b-2 flex items-baseline gap-4 shrink-0">
          <Metric>{entityData?.name}</Metric>
          <Badge>Entity Type: {entityData?.type}</Badge>
        </div>
        <div className="grid grid-cols-4 flex-1 overflow-hidden">
          <div className="flex flex-col gap-4 bg-tremor-background-subtle p-4 overflow-y-auto">
            <Card>
              <div className="flex items-center justify-between w-full">
                <Title className="shrink-0">Entity Information</Title>
              </div>
              <div className="h-4"></div>
              <List>
                {Object.entries(entityInfo).map(([key, value]) => (
                  <ListItem key={key}>
                    <span>{key}</span>
                    <span className="ml-4 truncate">
                      <HorzScroll>{value}</HorzScroll>
                    </span>
                  </ListItem>
                ))}
              </List>
            </Card>
            <Card>
              <div className="flex items-center justify-between w-full">
                <Title className="shrink-0">Labels</Title>
              </div>
              <div className="h-4"></div>
              {!!entityData?.labels?.length ? (
                <div className="flex flex-row flex-wrap">
                  {entityData.labels.map((label) => (
                    <Badge key={label}>{label}</Badge>
                  ))}
                </div>
              ) : (
                <Text>None</Text>
              )}
            </Card>
            <Card>
              <div className="flex items-center justify-between w-full">
                <Title className="shrink-0">Data</Title>
              </div>
              <div className="h-4"></div>
              <List>
                {Object.entries(entityData?.features ?? {}).map(
                  ([key, value]) => (
                    <ListItem key={key}>
                      <span className="mr-8">{key}</span>
                      <span className="truncate">
                        <HorzScroll>{value}</HorzScroll>
                      </span>
                    </ListItem>
                  )
                )}
              </List>
            </Card>
          </div>
          <div className="flex flex-col col-span-3 p-4 pb-0 overflow-hidden h-full">
            <TabGroup
              className="flex flex-col h-full"
              index={tab ?? undefined}
              onIndexChange={(idx) => {
                setTab(idx);
              }}
            >
              <TabList>
                <Tab>Event History</Tab>
                <Tab>Related Entities</Tab>
              </TabList>
              <TabPanels className="p-2 overflow-y-auto grow">
                <TabPanel className="">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <DateRangePicker
                        value={dateRange}
                        onValueChange={(value) =>
                          setDateRange(
                            Object.keys(value).length
                              ? value
                              : { from: undefined, to: undefined }
                          )
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Card>
                        <Title>Event History</Title>
                        <EntityEventChart entityId={entityId} />
                      </Card>
                    </div>
                    <div className="col-span-1">
                      <EventLabelDistribution
                        color={"gray"}
                        title={"Label Distribution"}
                        legend="Events"
                        eventFilters={{
                          entityId,
                        }}
                      />
                    </div>
                    <div className="col-span-3">
                      <Card className="p-0 pt-6">
                        <div className="flex items-center">
                          <Title className="px-6">Events</Title>
                          <div className="flex  bg-tremor-background-subtle rounded-md p-0.5">
                            <div onClick={() => setView("grid")}>
                              {view === "grid" ? (
                                <Card className="p-0">
                                  <Icon
                                    icon={LayoutGrid}
                                    size="xs"
                                    color="gray"
                                  />
                                </Card>
                              ) : (
                                <Icon
                                  icon={LayoutGrid}
                                  size="xs"
                                  color="gray"
                                  onClick={() => setView("list")}
                                />
                              )}
                            </div>

                            {view === "list" ? (
                              <Card className="p-0">
                                <Icon
                                  icon={AlignJustify}
                                  size="xs"
                                  color="gray"
                                />
                              </Card>
                            ) : (
                              <Icon
                                icon={AlignJustify}
                                size="xs"
                                color="gray"
                                onClick={() => setView("list")}
                              />
                            )}
                          </div>
                        </div>
                        <div className="h-4"></div>
                        {/* <DonutChart /> */}
                        <RenderEvents entityId={entityId} view={view} />
                      </Card>
                    </div>
                  </div>
                </TabPanel>
                <TabPanel>
                  <div className="col-span-2">
                    <RelatedEntities entityId={entityId} />
                  </div>
                </TabPanel>
              </TabPanels>
            </TabGroup>
          </div>
        </div>
      </main>
    </>
  );
}

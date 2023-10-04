import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  HStack,
  Stack,
  Tag,
  Tooltip,
} from "@chakra-ui/react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  AccordionList,
  BarList,
  Card,
  List,
  ListItem,
  Metric,
  Subtitle,
  Table,
  Text,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Title,
  Badge,
  TabList,
  TabGroup,
  Tab,
  TabPanel,
  TabPanels,
  Select,
  SelectItem,
  Icon,
} from "@tremor/react";
import { differenceInMinutes, format, formatRelative } from "date-fns";
import { enUS } from "date-fns/locale";
import { AlignJustify, FileQuestion, LayoutGrid, LogIn } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NumberParam, StringParam, useQueryParam } from "use-query-params";
import {
  DateRangePicker,
  EntityTypeFilter,
  useDateRange,
} from "~/components/Filters";
import { api, type RouterOutputs } from "~/utils/api";
import { EventLabelDistribution } from "../../components/EventLabelDistribution";
import { EventTimeChart } from "../../components/EventTimeChart";
import { Navbar } from "../../components/Navbar";
import { RenderEntity } from "../../components/RenderEntity";
import clsx from "clsx";
import { EventListItem } from "../../components/EventListItem";
import { EventDrawer } from "../../components/EventDrawer";
import { EventCard } from "../../components/EventCard";

type EntityType = RouterOutputs["entities"]["get"];

function getTypeAndId(fullId: string) {
  const [type, ...id] = fullId.split("_");
  return { type, id: id.join("_") };
}

// TODO: extract to component (used by dashboard too)
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

type EventType = RouterOutputs["entities"]["findEvents"][number];
function RenderEvent({
  event,
  isTopLevel,
}: {
  event: EventType;
  isTopLevel?: boolean;
}) {
  return (
    <Card>
      <HStack spacing={2} mb={2}>
        <Title>{event.type}</Title>
        {event.eventLabels.map((label) => (
          <Tag key={label.id} colorScheme="gray">
            {label.name}
          </Tag>
        ))}
      </HStack>
      <Text fontSize="sm" mb={3}>
        {format(event.timestamp, "MMM d, yyyy h:mm a")}
      </Text>

      <AccordionList>
        <Accordion>
          <AccordionHeader className="text-sm">Details</AccordionHeader>
          <AccordionBody>
            <List>
              {Object.entries(event.features).map(([key, value]) => (
                <ListItem key={key}>
                  <span>{key}</span>
                  <span>{value}</span>
                </ListItem>
              ))}
            </List>
          </AccordionBody>
        </Accordion>

        <>
          {event.entityLinks.map((link) => (
            <Accordion key={link.entity.id}>
              <AccordionHeader className="text-sm">
                <HStack spacing={2}>
                  <span>
                    {link.entity.type}: {link.entity.name}
                  </span>

                  {link.entity.entityLabels.map((label) => (
                    <Tag key={label.id} colorScheme="gray">
                      {label.name}
                    </Tag>
                  ))}
                </HStack>
              </AccordionHeader>
              <AccordionBody>
                <List>
                  {Object.entries(link.entity.features).map(([key, value]) => (
                    <ListItem key={key}>
                      <span>{key}</span>
                      <span>{value}</span>
                    </ListItem>
                  ))}
                </List>
              </AccordionBody>
            </Accordion>
          ))}
        </>
      </AccordionList>
    </Card>
  );
}

type BatchType = {
  events: EventType[];
  firstTimestamp: Date;
  lastTimestamp: Date;
  eventType: string;
};

function RenderBatch({
  batch,
  onClick,
  expanded,
}: {
  batch: BatchType;
  onClick?: () => void;
  expanded?: boolean;
}) {
  const getTypeSpecificDetails = useCallback(() => {
    switch (batch.eventType) {
      case "create-session": {
        return {
          icon: <LogIn />,
          description: <Text>Started {batch.events.length} sessions.</Text>,
        };
      }
      case "create-post": {
        return {
          icon: <FileQuestion />,
          description: <Text>Posted {batch.events.length} times.</Text>,
        };
      }
      default: {
        return {
          icon: <FileQuestion />,
          description: (
            <Text>
              {batch.eventType} ({batch.events.length} times)
            </Text>
          ),
        };
      }
    }
  }, [batch.eventType, batch.events.length]);

  if (batch.events.length === 1) {
    return <RenderEvent event={batch.events[0]!} isTopLevel={true} />;
  }

  const { icon, description } = getTypeSpecificDetails();
  return (
    <>
      {!expanded && (
        <Tooltip
          openDelay={500}
          placement="right"
          label={format(batch.firstTimestamp, "MMM d, yyyy h:mm a")}
        >
          <Alert
            mt={2}
            mb={expanded ? 1 : 0}
            variant="left-accent"
            colorScheme="gray"
            fontSize="sm"
            cursor="pointer"
            onClick={onClick}
          >
            <AlertIcon>{icon}</AlertIcon>
            <AlertDescription>{description}</AlertDescription>
          </Alert>
        </Tooltip>
      )}

      {expanded && (
        <>
          {batch.events.map((event) => (
            <RenderEvent event={event} key={event.id} />
          ))}
        </>
      )}
    </>
  );
}

function shouldAddToBatch(batch: BatchType, event: EventType) {
  if (event.eventLabels.length !== 0) {
    return false;
  }
  return (
    differenceInMinutes(batch.lastTimestamp, event.timestamp) < 1 &&
    batch.eventType === event.type
  );
}

function RenderEvents({
  entityId,
  view,
}: {
  entityId?: string;
  view: "list" | "grid";
}) {
  const [dateRange] = useDateRange();
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
  const [entityType, setEntityType] = useState<string | undefined>(undefined);
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
      <div className="flex items-center gap-4">
        <Select
          enableClear
          className="w-40"
          value={entityType}
          onValueChange={setEntityType}
          placeholder="All entities"
        >
          {entityTypes?.map((et) => (
            <SelectItem key={et.id} value={et.id}>
              {et.name}
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
            <SelectItem key={el.id} value={el.id}>
              {el.name}
            </SelectItem>
          )) ?? []}
        </Select>
      </div>
      <div className="flex flex-col">
        <Table className="mt-2">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell># Links</TableHeaderCell>
              <TableHeaderCell>Labels</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.length > 0 ? (
              data.map((entity) => (
                <TableRow key={entity.entityId}>
                  <TableCell>{entity.entityType}</TableCell>
                  <TableCell>
                    <b>
                      {entity.entityName}
                      {/* <RenderEntity entity={entity} /> */}
                    </b>
                  </TableCell>
                  <TableCell>{entity.count}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {entity.entityLabels.map((el) => (
                        <Tag key={el.name} colorScheme={el.color}>
                          {el.name}
                        </Tag>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4}>
                  <Text className="text-center">No related entities found</Text>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function formatDateReadable(date: Date) {
  return formatRelative(date, new Date(), {
    locale: {
      ...enUS,
      formatRelative: (token, _date, _baseDate, _options) => {
        switch (token) {
          case "today":
            return "h:mm a";
          case "yesterday":
            return "'Yesterday at' h:mm a";
          case "lastWeek":
            return "EEEE 'at' h:mm a";
          default:
            return "MMM d, yyyy, h:mm a";
        }
      },
    },
  });
}

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
              <TabPanels className="p-2 overflow-y-auto">
                <TabPanel className="">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <DateRangePicker />
                    </div>
                    <div className="col-span-2">
                      <EventTimeChart
                        color={"gray"}
                        title={"Event History"}
                        legend="Events"
                        entityFilters={{
                          entityId,
                        }}
                      />
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

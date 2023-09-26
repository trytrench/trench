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
} from "@tremor/react";
import { differenceInMinutes, format, formatRelative } from "date-fns";
import { enUS } from "date-fns/locale";
import { FileQuestion, LogIn } from "lucide-react";
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

type EventCardProps = {
  event: RouterOutputs["entities"]["findEvents"][number];
  selected?: boolean;
} & React.HTMLAttributes<HTMLButtonElement>;

function EventCard({ event, selected, ...rest }: EventCardProps) {
  const [eventType] = useQueryParam("eventType", StringParam);
  const router = useRouter();
  const entityId = router.query.entityId as string | undefined;

  const { data: eventLabels } = api.labels.getEventLabels.useQuery({
    eventType: eventType ?? undefined,
  });

  const selfLink = event.entityLinks.find((link) => link.entityId === entityId);

  return (
    <button
      className={clsx({
        "px-6 w-full flex items-center text-xs font-mono cursor-pointer text-left":
          true,
        "hover:bg-gray-50": !selected,
        "bg-gray-200 font-bold": selected,
      })}
      {...rest}
    >
      <Text className="w-32 mr-4 whitespace-nowrap shrink-0 text-xs py-1">
        {format(event.timestamp, "MM/dd HH:mm:ss a")}
      </Text>
      <Text className="w-56 mr-4 whitespace-nowrap shrink-0 text-xs truncate">
        {selfLink?.type} in {event.type}
      </Text>
      {eventLabels?.length ? (
        <span className="w-40 mr-4 overflow-hidden flex gap-1 shrink-0">
          {event.eventLabels.map((label) => (
            <Badge
              size="xs"
              key={label.id}
              color={label.color}
              className="py-0 cursor-pointer"
            >
              <span className="text-xs">{label.name}</span>
            </Badge>
          ))}
        </span>
      ) : null}

      <Text className="truncate flex-1 w-0 text-xs">
        {JSON.stringify(event.data)}
      </Text>
    </button>
  );
}

function RenderEvents({ entityId }: { entityId?: string }) {
  const [dateRange] = useDateRange();
  const { data } = api.entities.findEvents.useQuery({
    entityId: entityId ?? "",
    limit: 100,
    filters: {
      dateRange: {
        from: dateRange.from.getTime(),
        to: dateRange.to.getTime(),
      },
    },
  });

  return (
    <Stack spacing={2}>
      {data?.map((event) => (
        <EventCard event={event} isTopLevel={true} />
      ))}
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

  // Entity Data
  // TODO: handle when entityId is a string[], + other cases
  const { data: entityData } = api.entities.get.useQuery({
    id: entityId ?? "",
  });

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
              {entityData?.entityLabels &&
              entityData?.entityLabels.length > 0 ? (
                <div className="flex flex-row flex-wrap">
                  {entityData?.entityLabels.map((label) => (
                    <Tag
                      key={label.name}
                      colorScheme={
                        label && label.color !== "" ? label.color : "gray"
                      }
                    >
                      {label.name}
                    </Tag>
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
                      <Card className="p-0">
                        <Title className="p-6 pb-0">Events</Title>
                        <div className="h-4"></div>
                        {/* <DonutChart /> */}
                        <RenderEvents entityId={entityId} />
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

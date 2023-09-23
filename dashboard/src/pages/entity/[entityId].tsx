import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  HStack,
  Stack,
  Tag,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  AccordionList,
  Card,
  List,
  ListItem,
  Metric,
  Subtitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Title,
} from "@tremor/react";
import { differenceInMinutes, format, formatRelative } from "date-fns";
import { enUS } from "date-fns/locale";
import { FileQuestion, LogIn } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useMemo } from "react";
import { StringParam, useQueryParam } from "use-query-params";
import { DateRangePicker, EntityTypeFilter } from "~/components/Filters";
import { api, type RouterOutputs } from "~/utils/api";
import { EventLabelDistribution } from "../../components/EventLabelDistribution";
import { EventTimeChart } from "../../components/EventTimeChart";
import { Navbar } from "../../components/Navbar";
import { RenderEntity } from "../../components/RenderEntity";
import { useDatasetSelectionStore } from "~/lib/datasetSelectionState";

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

function RenderEvents({ entityId }: { entityId?: string }) {
  const datasetId = useDatasetSelectionStore((state) => state.selection);

  const { data } = api.entities.findEvents.useQuery({
    entityId: entityId ?? "",
    limit: 100,
    datasetId,
  });

  return (
    <Stack spacing={2}>
      {data?.map((event) => (
        <RenderEvent event={event} isTopLevel={true} />
      ))}
    </Stack>
  );
}

function RelatedEntities({ entityId }: { entityId?: string }) {
  const [entityType] = useQueryParam("entityType", StringParam);

  const datasetId = useDatasetSelectionStore((state) => state.selection);

  const { data } = api.entities.findRelatedEntities.useQuery({
    id: entityId ?? "",
    entityType,
    datasetId,
  });

  return (
    <Card>
      <Title>Related Entities</Title>
      <Box mt={2} />
      <EntityTypeFilter />
      <div className="flex flex-col max-h-80">
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
                <TableRow key={entity.id}>
                  <TableCell>{entity.type}</TableCell>
                  <TableCell>
                    <b>
                      <RenderEntity entity={entity} />
                    </b>
                  </TableCell>
                  <TableCell>{entity.linkCount}</TableCell>
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
    </Card>
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

  const datasetId = useDatasetSelectionStore((state) => state.selection);

  // Entity Data
  // TODO: handle when entityId is a string[], + other cases
  const { data: entityData } = api.entities.get.useQuery({
    id: entityId ?? "",
    datasetId,
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

  return (
    <>
      <Navbar datasetSelectDisabled />

      <div className="p-6 border-b">
        <Metric className="shrink-0 font-normal">
          {entityData?.type}: <b>{entityData?.name}</b>
        </Metric>
        <Subtitle>ID: {entityData?.id}</Subtitle>
      </div>

      <main>
        <div className="grid grid-cols-4 gap-4 p-4">
          <div className="col-span-3 flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 grid gap-4 grid-cols-2 auto-rows-min">
                <div className="col-span-2">
                  <DateRangePicker />
                </div>
                <EventTimeChart
                  color={"gray"}
                  title={"Event History"}
                  legend="Events"
                  entityFilters={{
                    entityId,
                  }}
                />
                <EventLabelDistribution
                  title={"Event Labels"}
                  entityFilters={{
                    entityId,
                  }}
                />
                <div className="col-span-2">
                  <RelatedEntities entityId={entityId} />
                </div>
              </div>
            </div>
            <Card>
              <Title>Events</Title>
              <div className="h-4"></div>
              {/* <DonutChart /> */}
              <RenderEvents entityId={entityId} />
            </Card>
          </div>
          <div className="flex flex-col gap-4">
            <Card>
              <div className="flex items-center justify-between w-full">
                <Title className="shrink-0">Information</Title>
              </div>
              <div className="h-4"></div>
              <List>
                {Object.entries(entityInfo).map(([key, value]) => (
                  <ListItem key={key}>
                    <span>{key}</span>
                    <span>
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
                  {entityData?.entityLabels.map((entityToLabel) => {
                    const label = entityToLabel.entityLabel;
                    return (
                      <Tag
                        key={label.name}
                        colorScheme={
                          label && label.color !== "" ? label.color : "gray"
                        }
                      >
                        {label.name}
                      </Tag>
                    );
                  })}
                </div>
              ) : (
                <Text>None</Text>
              )}
            </Card>
            <Card className="grow">
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
        </div>
      </main>
    </>
  );
}

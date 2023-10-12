// Events list with cool timeline display
// used in entity page, but not events page.

import { SimpleGrid, Spinner } from "@chakra-ui/react";

import { Badge, Button, Card, Icon, Title, Text } from "@tremor/react";
import clsx from "clsx";
import { AlignJustify, LayoutGrid } from "lucide-react";
import { useMemo, useState } from "react";
import { useFilters } from "~/components/Filter";
import { RouterOutputs, api } from "~/utils/api";
import { EventDrawer } from "./EventDrawer";
import { EntityDrawer } from "./EntityDrawer";
import { EventListItem } from "./EventListItem";
import { format } from "date-fns";
import { uniq } from "lodash";
import { EntityChip } from "./EntityChip";

interface Props {
  entityId?: string;
  datasetId: string;
}

export default function EventsList({ entityId, datasetId }: Props) {
  const [view, setView] = useState<"grid" | "list">("list");
  const { type, features, labels, sortBy } = useFilters();
  const [limit, setLimit] = useState(50);

  const {
    data: events,
    fetchNextPage,
    isLoading: eventsLoading,
    isFetchingNextPage,
    hasNextPage,
  } = api.lists.getEventsList.useInfiniteQuery(
    {
      eventFilters: {
        eventType: type,
        eventLabels: labels,
        eventFeatures: features,
        entityId,
      },
      datasetId,
      limit,
    },
    {
      enabled: !!datasetId,
      getNextPageParam: (lastPage, pages) => {
        if (lastPage.rows.length < limit) return undefined;
        return pages.length * limit;
      },
    }
  );

  const allEvents = useMemo(() => {
    return events?.pages.flatMap((page) => page.rows) ?? [];
  }, [events]);

  type DividerItem = {
    type: "divider";
    duration: number;
  };
  type Event = RouterOutputs["lists"]["getEventsList"]["rows"][number];
  type EventItem = {
    type: "event";
    event: Event;
  };
  const listItems: (DividerItem | EventItem)[] = useMemo(() => {
    // not applicable in list view
    if (view !== "grid") return [];

    // if two events differ by over two hours, insert a divider item
    const dividerThreshold = 1000 * 60 * 60 * 2;
    const items: (DividerItem | EventItem)[] = [];
    let lastEvent: Event | null = null;

    for (const event of allEvents) {
      if (lastEvent) {
        const time = new Date(event.timestamp).getTime();
        const lastTime = new Date(lastEvent.timestamp).getTime();
        const duration = Math.abs(time - lastTime);
        if (duration > dividerThreshold) {
          items.push({
            type: "divider",
            duration,
          });
        }
      }
      items.push({
        type: "event",
        event,
      });
      lastEvent = event;
    }

    return items;
  }, [allEvents, view]);

  const [selectedEvent, setSelectedEvent] = useState<
    RouterOutputs["lists"]["getEventsList"]["rows"][number] | null
  >(null);

  const [selectedEntity, setSelectedEntity] = useState<
    RouterOutputs["lists"]["getEntitiesList"]["rows"][number] | null
  >(null);

  return (
    <>
      <EventDrawer
        datasetId={datasetId}
        isOpen={!!selectedEvent}
        onClose={() => {
          setSelectedEvent(null);
        }}
        selectedEvent={selectedEvent}
      />

      <EntityDrawer
        datasetId={datasetId}
        isOpen={!!selectedEntity}
        onClose={() => {
          setSelectedEntity(null);
        }}
        selectedEntity={selectedEntity}
      />

      <div className="flex justify-end py-2 px-4 border-b border-b-tremor-border">
        <div className="flex bg-tremor-background-subtle rounded-md p-0.5">
          <div onClick={() => setView("grid")}>
            {view === "grid" ? (
              <Card className="p-0">
                <Icon icon={LayoutGrid} size="xs" color="gray" />
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
              <Icon icon={AlignJustify} size="xs" color="gray" />
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
      <div
        className={clsx("h-full flex flex-col overflow-y-auto px-4 pt-2", {
          "gap-0": view === "grid",
        })}
      >
        {eventsLoading ? (
          <Spinner alignSelf="center" mt={3} />
        ) : (
          <>
            {view === "list"
              ? allEvents.map((event) => (
                  <EventListItem
                    key={event.id}
                    event={event}
                    onClick={() => {
                      setSelectedEvent(event);
                    }}
                    selected={selectedEvent?.id === event.id}
                  />
                ))
              : listItems.map((item, idx) =>
                  item.type === "event" ? (
                    <EventCard
                      key={item.event.id}
                      datasetId={datasetId}
                      event={item.event}
                      isFirst={idx === 0}
                      isLast={idx === listItems.length - 1}
                      onEntityClicked={(entity) => {
                        setSelectedEntity(entity);
                      }}
                    />
                  ) : (
                    <TimeDivider key={item.duration} duration={item.duration} />
                  )
                )}
            {hasNextPage && (
              <div className="self-center my-4">
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => {
                    fetchNextPage().catch((err) => {
                      console.error(err);
                    });
                  }}
                  loading={isFetchingNextPage}
                >
                  Fetch more events
                </Button>
              </div>
            )}
          </>
        )}

        <div className="h-16 shrink-0"></div>
      </div>
      <div className="absolute bottom-0 left-0 h-8 w-full bg-gradient-to-t from-white pointer-events-none"></div>
    </>
  );
}

//

interface TimeDividerProps {
  duration: number;
}

function TimeDivider({ duration }: TimeDividerProps) {
  // height based on duration: breakpoints at 1 day, 1 week, 1 month, 1 year
  const breakpoints = [
    [1000 * 60 * 60 * 24, "h-[6rem]"],
    [1000 * 60 * 60 * 24 * 7, "h-[6rem]"],
    [1000 * 60 * 60 * 24 * 30, "h-[8rem]"],
    [1000 * 60 * 60 * 24 * 365, "h-[10rem]"],
  ] as const;

  const time = new Date(duration).getTime();
  const height = breakpoints.find(([threshold]) => time < threshold)?.[1];

  const stripedGradient = `repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 8px,
    #d1d5db 8px,
    #d1d5db 16px
  )`;

  const timeToWords = (time: number) => {
    // under a day --> n hours
    if (time < 1000 * 60 * 60 * 24) {
      return `${Math.floor(time / (1000 * 60 * 60))} hour(s)`;
    }

    // under a week --> n days
    if (time < 1000 * 60 * 60 * 24 * 7) {
      return `${Math.floor(time / (1000 * 60 * 60 * 24))} day(s)`;
    }

    // under a month --> n weeks
    if (time < 1000 * 60 * 60 * 24 * 30) {
      return `${Math.floor(time / (1000 * 60 * 60 * 24 * 7))} week(s)`;
    }

    // under a year --> n months
    if (time < 1000 * 60 * 60 * 24 * 365) {
      return `${Math.floor(time / (1000 * 60 * 60 * 24 * 30))} month(s)`;
    }

    // over a year --> n years
    return `${Math.floor(time / (1000 * 60 * 60 * 24 * 365))} year(s)`;
  };

  return (
    <div className={`flex ${height}`}>
      <div className="w-[3rem] relative h-full shrink-0">
        <div
          className="absolute left-0 w-[2px] ml-3 h-full"
          style={{
            background: stripedGradient,
          }}
        />
      </div>
      <div className="italic text-gray-300 my-auto grow text-md">
        {timeToWords(duration)}
      </div>
    </div>
  );
}

//

interface EventCardProps {
  event: RouterOutputs["lists"]["getEventsList"]["rows"][number];
  datasetId: string;
  isFirst: boolean;
  isLast: boolean;
  onEntityClicked: (
    entity: RouterOutputs["lists"]["getEntitiesList"]["rows"][number]
  ) => void;
}

function EventCard(props: EventCardProps) {
  const { event, isFirst, isLast, onEntityClicked } = props;
  const { datasetId } = props;

  const eventLabels = uniq(event.labels.filter((label) => label !== ""));
  const eventFeatures = Object.entries(event.features);
  const hasFeatures = eventFeatures.length > 0;

  return (
    <div className="flex">
      <div className="w-[3rem] relative shrink-0">
        <div className="absolute left-0 w-[2px] bg-gray-300 ml-3 h-full" />
        <div className="absolute w-[14px] h-[14px] left-[6px] top-[24px] rounded-full bg-white border-2 border-gray-300" />
        {isFirst && (
          <div className="absolute top-0 w-full h-4 bg-gradient-to-b from-white to-transparent" />
        )}
        {isLast && (
          <div className="absolute bottom-0 w-full h-12 bg-gradient-to-t from-white to-transparent" />
        )}
      </div>
      <div className="w-[22rem] mt-4">
        <div className="flex">
          <Title className="text-sm">{event.type}</Title>
        </div>
        <Text>
          {format(new Date(event.timestamp), "MMM d, yyyy h:mm:ss a")}
        </Text>
        <div className="flex flex-wrap gap-1 mt-3">
          {eventLabels.length > 0 ? (
            eventLabels.map((label, idx) => {
              return (
                <Badge key={idx} size="xs">
                  {label}
                </Badge>
              );
            })
          ) : (
            <></>
          )}
        </div>
      </div>
      <Card className="mt-3 min-w-0">
        {hasFeatures ? (
          <>
            <SimpleGrid columns={5} spacing={2}>
              {eventFeatures.map(([key, value], idx) => (
                <div key={key}>
                  <Text className="font-semibold">{key}</Text>
                  <Text className="truncate">
                    {value === 0
                      ? "0"
                      : value === true
                      ? "True"
                      : value === false
                      ? "False"
                      : (value as string) || "-"}
                  </Text>
                </div>
              ))}
            </SimpleGrid>
          </>
        ) : (
          <Text className="italic text-gray-400">No features</Text>
        )}
        <div className="h-2"></div>

        <div className="flex gap-1.5 flex-wrap mt-2">
          {event.entities.map((entity) => {
            return <EntityChip entity={entity} datasetId={datasetId} />;
          })}
        </div>
      </Card>
    </div>
  );
}

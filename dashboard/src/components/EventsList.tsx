import { LayoutGrid, List, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useFilters } from "~/components/Filter";
import ListFilter from "~/components/ListFilter";
import { RouterOutputs, api } from "~/utils/api";
import { EventDrawer } from "./EventDrawer";
import { EventListItem } from "./EventListItem";
import { format } from "date-fns";
import { uniq } from "lodash";
import { EntityChip } from "./EntityChip";
import { Badge } from "./ui/badge";
import { Panel } from "./ui/custom/panel";
import { Toggle } from "~/components/ui/toggle";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

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

  return (
    <>
      <EventDrawer
        datasetId={datasetId}
        isOpen={!!selectedEvent}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
        selectedEvent={selectedEvent}
      />

      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center py-2 px-4 border-b">
          <ListFilter
            options={{
              types: ["create-session", "payment-attempt"],
              labels: ["needs KYC", "success", "blocked"],
              features: [
                { feature: "amount", dataType: "number" },
                { feature: "is_recurring", dataType: "boolean" },
              ],
            }}
            onChange={(v) => {
              console.log(v);
            }}
          />

          <div className="flex pl-2 border-l gap-1">
            <Toggle
              className="p-1 px-2 my-auto h-6 flex items-center"
              onClick={() => setView("grid")}
              pressed={view === "grid"}
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" />
              <span className="text-xs">Grid</span>
            </Toggle>
            <Toggle
              className="p-1 px-2 my-auto h-6 flex items-center"
              onClick={() => setView("list")}
              pressed={view === "list"}
            >
              <List className="h-4 w-4 mr-1.5" />
              <span className="text-xs">List</span>
            </Toggle>
          </div>
        </div>

        <div className="grow flex flex-col relative px-4 pt-2">
          {eventsLoading ? (
            // <Spinner alignSelf="center" mt={3} />
            <div>loading</div>
          ) : (
            <div className="absolute inset-0">
              <ScrollArea className="h-full px-4">
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
                        />
                      ) : (
                        <TimeDivider
                          key={item.duration}
                          duration={item.duration}
                        />
                      )
                    )}
                {hasNextPage && (
                  <div className="w-auto mt-4 mb-6 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        fetchNextPage().catch((err) => {
                          console.error(err);
                        });
                      }}
                    >
                      <Loader2
                        className={`${
                          isFetchingNextPage ? "w-4 mr-2" : "w-0 mr-0"
                        } h-4 animate-spin transition-all`}
                      />
                      Fetch more events
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          <div className="h-16 shrink-0"></div>
        </div>
        <div className="absolute bottom-0 left-0 h-8 w-full bg-gradient-to-t from-white pointer-events-none"></div>
      </div>
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
}

function EventCard(props: EventCardProps) {
  const { event, isFirst, isLast } = props;
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
      <div className="w-[16rem] mt-4">
        <div className="flex">
          <h1 className="text-lg">{event.type}</h1>
        </div>
        <div className="text-xs text-muted-foreground">
          {format(new Date(event.timestamp), "MMM d, yyyy h:mm:ss a")}
        </div>
        <div className="flex flex-wrap gap-1 mt-3">
          {eventLabels.length > 0 ? (
            eventLabels.map((label, idx) => {
              return (
                <Badge key={idx} variant="default">
                  {label}
                </Badge>
              );
            })
          ) : (
            <></>
          )}
        </div>
      </div>
      <Panel className="mt-3 min-w-0 flex-1 text-sm text-muted-foreground">
        {hasFeatures ? (
          <>
            <div className="grid grid-cols-5 gap-4">
              {eventFeatures.map(([key, value], idx) => (
                <div key={key}>
                  <div className="font-semibold">{key}</div>
                  <div className="truncate">
                    {value === 0
                      ? "0"
                      : value === true
                      ? "True"
                      : value === false
                      ? "False"
                      : (value as string) || "-"}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="italic text-gray-400">No features</div>
        )}
        <div className="h-2"></div>

        <div className="flex gap-1.5 flex-wrap mt-2">
          {event.entities.map((entity) => {
            return <EntityChip entity={entity} datasetId={datasetId} />;
          })}
        </div>
      </Panel>
    </div>
  );
}

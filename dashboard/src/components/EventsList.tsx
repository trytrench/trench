import { format } from "date-fns";
import { LayoutGrid, List, Loader2Icon } from "lucide-react";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { Toggle } from "~/components/ui/toggle";
import { EventFilters } from "~/shared/validation";
import { RouterOutputs, api } from "~/utils/api";
import { EntityChip } from "./EntityChip";
import { EventDrawer } from "./EventDrawer";
import { EventListItem } from "./EventListItem";
import { Panel } from "./ui/custom/panel";
import { SpinnerButton } from "./ui/custom/spinner-button";
import { ScrollArea } from "./ui/scroll-area";

interface Props {
  entityId?: string;
  datasetId: string;
  projectId: string;
}

export default function EventsList({ entityId, datasetId, projectId }: Props) {
  const [view, setView] = useState<"grid" | "list">("list");
  const [limit, setLimit] = useState(50);

  const [filters, setFilters] = useState<EventFilters>(undefined);

  const {
    data: events,
    fetchNextPage,
    isLoading: eventsLoading,
    isFetchingNextPage,
    hasNextPage,
  } = api.lists.getEventsList.useInfiniteQuery(
    {
      eventFilters: filters,
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
        {/* Grid / List view Toggle */}
        <div className="flex justify-between items-center py-3 px-8 border-b">
          {/* <EventFilter datasetId={datasetId} onChange={setFilters} /> */}

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

        {/* The Events List */}
        <div className="grow flex flex-col relative px-4 pt-2">
          {eventsLoading ? (
            <Loader2Icon className="w-8 h-8 text-gray-300 animate-spin self-center" />
          ) : (
            <div className="absolute inset-0">
              <ScrollArea className="h-full px-4">
                {view === "list" ? (
                  <>
                    <div className="h-2" />
                    {allEvents.map((event) => (
                      <EventListItem
                        key={event.id}
                        event={event}
                        onClick={() => {
                          setSelectedEvent(event);
                        }}
                        selected={selectedEvent?.id === event.id}
                      />
                    ))}
                  </>
                ) : (
                  listItems.map((item, idx) =>
                    item.type === "event" ? (
                      <EventCard
                        key={item.event.id}
                        datasetId={datasetId}
                        event={item.event}
                        features={item.event.features ?? []}
                        isFirst={idx === 0}
                        isLast={idx === listItems.length - 1}
                      />
                    ) : (
                      <TimeDivider
                        key={item.duration}
                        duration={item.duration}
                      />
                    )
                  )
                )}
                {hasNextPage && (
                  <div className="w-auto mt-4 mb-6 flex justify-center">
                    <SpinnerButton
                      variant="outline"
                      onClick={() => {
                        fetchNextPage().catch((err) => {
                          console.error(err);
                        });
                      }}
                      loading={isFetchingNextPage}
                    >
                      Fetch more events
                    </SpinnerButton>
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
  isFirst: boolean;
  isLast: boolean;
  features: {
    id: string;
    name: string;
    value: string;
    dataType: string;
  }[];
}

function EventCard({
  event,
  isFirst,
  isLast,
  features,
  datasetId,
}: EventCardProps) {
  const router = useRouter();

  // const eventLabels = uniq(event.labels.filter((label) => label !== ""));

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
          <h1 className="text-lg text-emphasis-foreground">{event.type}</h1>
        </div>
        <div className="text-xs text-muted-foreground">
          {format(new Date(event.timestamp), "MMM d, yyyy h:mm:ss a")}
        </div>
        <div className="flex flex-wrap gap-1 mt-3">
          {/* {eventLabels.length > 0 ? (
            eventLabels.map((label, idx) => {
              return (
                <Badge key={idx} variant="default">
                  {label}
                </Badge>
              );
            })
          ) : (
            <></>
          )} */}
        </div>
      </div>
      <Panel className="mt-3 min-w-0 flex-1 text-sm text-muted-foreground">
        {features.length > 0 ? (
          <>
            <div className="grid grid-cols-5 gap-4">
              {features.map(
                ({ name, value, dataType, entityName, entityType }, idx) => (
                  <div key={name}>
                    <div className="font-semibold">{name}</div>
                    {dataType === "entity" && value ? (
                      <EntityChip
                        entity={{
                          id: value,
                          name: entityName,
                          type: entityType,
                        }}
                        datasetId={datasetId}
                        href={`/${
                          router.query.project as string
                        }/entity/${value}`}
                      />
                    ) : (
                      <div className="truncate">
                        {value === 0
                          ? "0"
                          : value === true
                          ? "True"
                          : value === false
                          ? "False"
                          : (JSON.stringify(value) as string) || "-"}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </>
        ) : (
          <div className="italic text-gray-400">No features</div>
        )}
        <div className="h-2"></div>

        {/* <div className="flex gap-1.5 flex-wrap mt-2">
          {event.entities.map((entity) => {
            return (
              <EntityChip
                key={entity.id}
                entity={entity}
                href={`/${router.query.project as string}/entity/${entity.id}`}
              />
            );
          })}
        </div> */}
      </Panel>
    </div>
  );
}

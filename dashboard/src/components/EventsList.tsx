import clsx from "clsx";
import { Entity } from "event-processing";
import { uniq } from "lodash";
import {
  ChevronLeft,
  LayoutGrid,
  List,
  Loader2Icon,
  MoreHorizontal,
} from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { Toggle } from "~/components/ui/toggle";
import { useEntityNameMap } from "~/hooks/useEntityNameMap";
import { handleError } from "~/lib/handleError";
import { EventViewConfig } from "~/shared/validation";
import { RouterOutputs, api } from "~/utils/api";
import { EditViewDialog } from "./EditViewDialog";
import { EventCard } from "./EventCard";
import { EventDrawer } from "./EventDrawer";
import { EventListItem } from "./EventListItem";
import { EditEventFilters } from "./filters/EditEventFilters";
import { Button } from "./ui/button";
import { SpinnerButton } from "./ui/custom/spinner-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ScrollArea } from "./ui/scroll-area";

interface EventsListProps {
  entity: Entity;
}

const useEventViewConfig = (entity?: Entity) => {
  const router = useRouter();

  const { data: views, refetch } = api.eventViews.list.useQuery();

  const [viewConfig, setViewConfig] = useState<EventViewConfig | null>(null);

  useEffect(() => {
    if (views?.[0]) {
      // If there are views, and the query param is set, set the view config
      if (router.query.view) {
        const view = views.find((view) => view.id === router.query.view);
        if (view) setViewConfig(view.config);
      } else {
        // If there are views, but no query param, set the query param to the first view
        router
          .push({
            pathname: router.pathname,
            query: { ...router.query, view: views[0].id },
          })
          .catch(handleError);
      }
    }
  }, [views, router, entity]);

  useEffect(() => {
    // If there are no views, set default
    if (views && !views.length && !viewConfig) {
      setViewConfig({
        type: "grid",
        filters: {},
        gridConfig: {},
      });
    }
  }, [views, viewConfig]);

  return { viewConfig, setViewConfig };
};

export default function EventsList({ entity }: EventsListProps) {
  const router = useRouter();
  const { viewConfig, setViewConfig } = useEventViewConfig();

  const [limit, setLimit] = useState(50);

  const { mutateAsync: createView } = api.eventViews.create.useMutation();
  const { mutateAsync: updateView } = api.eventViews.update.useMutation();
  const { mutateAsync: deleteView } = api.eventViews.delete.useMutation();

  const { data: views, refetch: refetchViews } = api.eventViews.list.useQuery();

  const {
    data: events,
    fetchNextPage,
    isLoading: eventsLoading,
    isFetchingNextPage,
    hasNextPage,
  } = api.lists.getEventsList.useInfiniteQuery(
    {
      eventFilters: {
        ...viewConfig?.filters,
        entities: entity ? [entity] : undefined,
      },
      limit,
    },
    {
      getNextPageParam: (lastPage, pages) => {
        if (lastPage.rows.length < limit) return undefined;
        return pages.length * limit;
      },
    }
  );

  const allEvents = useMemo(() => {
    return events?.pages.flatMap((page) => page.rows) ?? [];
  }, [events]);

  const entityIds = useMemo(() => {
    return uniq(allEvents.flatMap((event) => event.entities.map((e) => e.id)));
  }, [allEvents]);
  const entityNameMap = useEntityNameMap(entityIds);

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
    if (viewConfig?.type !== "grid") return [];

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
  }, [allEvents, viewConfig]);

  const [selectedEvent, setSelectedEvent] = useState<
    RouterOutputs["lists"]["getEventsList"]["rows"][number] | null
  >(null);

  const [showViews, setShowViews] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      <EventDrawer
        isOpen={!!selectedEvent}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
        selectedEvent={selectedEvent}
      />

      <div className="flex flex-col h-full">
        {/* Grid / List view Toggle */}
        <div className="flex justify-between items-center py-3 px-8 border-b">
          <Button
            size="iconXs"
            variant="outline"
            className="mr-8"
            onClick={() => setShowViews(!showViews)}
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </Button>
          <EditEventFilters
            value={viewConfig?.filters ?? {}}
            onChange={(newFilters) => {
              if (viewConfig)
                setViewConfig({ ...viewConfig, filters: newFilters });
            }}
          />

          <div className="flex pl-2 border-l gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
            <Toggle
              className="p-1 px-2 my-auto h-6 flex items-center"
              onClick={() => {
                if (viewConfig) setViewConfig({ ...viewConfig, type: "grid" });
              }}
              pressed={viewConfig?.type === "grid"}
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" />
              <span className="text-xs">Grid</span>
            </Toggle>
            <Toggle
              className="p-1 px-2 my-auto h-6 flex items-center"
              onClick={() => {
                if (viewConfig) setViewConfig({ ...viewConfig, type: "feed" });
              }}
              pressed={viewConfig?.type === "feed"}
            >
              <List className="h-4 w-4 mr-1.5" />
              <span className="text-xs">Feed</span>
            </Toggle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="xs" variant="outline">
                Save
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onSelect={() => {
                  if (viewConfig && typeof router.query.view === "string") {
                    console.log(viewConfig);
                    updateView({
                      id: router.query.view,
                      config: viewConfig,
                    })
                      .then(() => refetchViews())
                      .catch(handleError);
                  }
                }}
              >
                Save to this view
              </DropdownMenuItem>

              <EditViewDialog
                title="Create new view"
                onSubmit={(values) => {
                  if (viewConfig)
                    createView({
                      name: values.name,
                      config: viewConfig,
                      // entityTypeId: seenWithEntity?.type,
                    })
                      .then(() => {
                        return refetchViews();
                      })
                      .catch(handleError);
                }}
              >
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Create new view
                </DropdownMenuItem>
              </EditViewDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex h-full">
          {showViews && (
            <div className="w-64 border-r shrink-0 space-y-1 pt-4 px-6">
              <div className="text-sm font-medium text-emphasis-foreground">
                Views
              </div>

              {views?.map((view) => (
                <div
                  onClick={() =>
                    router.push({
                      pathname: router.pathname,
                      query: { ...router.query, view: view.id },
                    })
                  }
                  key={view.id}
                  className={clsx(
                    "px-4 py-1 w-full text-sm text-muted-foreground text-left rounded-md transition flex justify-between items-center hover:bg-muted cursor-pointer",
                    {
                      "bg-accent text-accent-foreground":
                        router.query.view === view.id,
                    }
                  )}
                >
                  {view.name}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="iconXs"
                        variant="link"
                        className="h-3 ml-auto shrink-0"
                      >
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent>
                      <EditViewDialog
                        title="Update view"
                        onSubmit={(values) => {
                          if (typeof router.query.view === "string") {
                            updateView({
                              id: router.query.view,
                              name: values.name,
                            })
                              .then(() => {
                                return refetchViews();
                              })
                              .catch(handleError);
                          }
                        }}
                      >
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          Rename
                        </DropdownMenuItem>
                      </EditViewDialog>

                      <DropdownMenuItem
                        onSelect={() => {
                          if (typeof router.query.view === "string") {
                            deleteView({ id: router.query.view })
                              .then(() => refetchViews())
                              .catch(handleError);
                          }
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}

          {/* The Events List */}
          <div className="grow flex flex-col relative px-4 pt-2">
            {eventsLoading ? (
              <Loader2Icon className="w-8 h-8 text-muted-foreground animate-spin self-center" />
            ) : (
              <div className="absolute inset-0">
                <ScrollArea className="h-full px-4">
                  {viewConfig?.type === "feed" ? (
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
                          event={item.event}
                          isFirst={idx === 0}
                          isLast={idx === listItems.length - 1}
                          entityNameMap={entityNameMap}
                          config={
                            viewConfig?.gridConfig[item.event.type] ?? {
                              featureOrder: {},
                              entityTypeOrder: [],
                            }
                          }
                          onConfigChange={(newConfig) => {
                            if (viewConfig)
                              setViewConfig({
                                ...viewConfig,
                                gridConfig: {
                                  ...viewConfig.gridConfig,
                                  [item.event.type]: newConfig,
                                },
                              });
                          }}
                          isEditing={isEditing}
                        />
                      ) : (
                        <TimeDivider
                          key={item.duration}
                          duration={item.duration}
                        />
                      )
                    )
                  )}
                  <div className="w-auto mt-4 mb-6 flex justify-center">
                    {hasNextPage ? (
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
                    ) : (
                      <div className="text-sm text-muted-fg italic">
                        No more Events.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            <div className="h-16 shrink-0"></div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-8 w-full bg-gradient-to-t from-background pointer-events-none"></div>
      </div>
    </>
  );
}

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
    hsl(var(--muted-foreground)) 8px,
    hsl(var(--muted-foreground)) 16px
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
      <div className="italic text-muted-foreground my-auto grow text-md">
        {timeToWords(duration)}
      </div>
    </div>
  );
}

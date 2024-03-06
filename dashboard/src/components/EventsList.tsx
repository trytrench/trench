import { uniq } from "lodash";
import {
  LayoutGrid,
  List,
  Loader2Icon,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { handleError } from "~/lib/handleError";
import {
  EventFilter,
  EventFilterType,
  EventViewConfig,
} from "~/shared/validation";
import { RouterOutputs, api } from "~/utils/api";
import { EventCard } from "./EventCard";
import { EventDrawer } from "./EventDrawer";
import { EventListItem } from "./EventListItem";
import { ViewsLayout } from "./ViewsLayout";
import { EditEventFilters } from "./filters/EditEventFilters";
import { RenderEventFilters } from "./filters/RenderEventFilters";
import { SpinnerButton } from "./ui/custom/spinner-button";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { SidebarButton } from "./ui/custom/sidebar-button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { table } from "console";
import { cn } from "../lib/utils";
import { DataTable } from "./ui/data-table";
import { DataTableViewOptions } from "./ui/data-table-view-options";
import { toast } from "./ui/use-toast";
import { Button } from "./ui/button";
import { useEntityNameMap } from "../hooks/useEntityNameMap";
import { Entity } from "event-processing";

type EventView = RouterOutputs["eventViews"]["list"][number];

interface EventsListProps {
  entity?: Entity;
}

export default function EventsList({ entity }: EventsListProps) {
  const router = useRouter();

  const { data: views, refetch: refetchViews } = api.eventViews.list.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    }
  );

  const selectedViewId = router.query.view as string | undefined;

  const viewConfig = useMemo(() => {
    if (!views) return null;
    return views.find((view) => view.id === selectedViewId)?.config;
  }, [views, selectedViewId]);

  const selectedView = useMemo(() => {
    return views?.find((view) => view.id === selectedViewId);
  }, [views, selectedViewId]);

  const [currentViewState, setCurrentViewState] = useState<EventViewConfig>({
    type: "feed",
    filters: [],
  });
  useEffect(() => {
    if (viewConfig) {
      setCurrentViewState({
        ...viewConfig,
        filters: [], // Filters are handled separately
      });
    } else {
      setCurrentViewState({
        type: "feed",
        filters: [],
        gridConfig: undefined,
        tableConfig: undefined,
      });
    }
  }, [viewConfig]);

  const [limit, setLimit] = useState(50);

  const { mutateAsync: createView } = api.eventViews.create.useMutation();
  const { mutateAsync: updateView } = api.eventViews.update.useMutation();
  const { mutateAsync: deleteView } = api.eventViews.delete.useMutation();

  const filters = useMemo(() => {
    const arr: EventFilter[] = [];
    if (viewConfig?.filters) {
      arr.push(...viewConfig.filters);
    }
    if (entity) {
      arr.push({
        type: EventFilterType.Entities,
        data: [entity],
      });
    }
    return arr;
  }, [viewConfig, entity]);

  const {
    data: events,
    fetchNextPage,
    isLoading: eventsLoading,
    isFetchingNextPage,
    hasNextPage,
  } = api.lists.getEventsList.useInfiniteQuery(
    {
      eventFilters: filters,
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
    return uniq(
      allEvents.flatMap((event) =>
        event.entities.map((e) => `${e.type}_${e.id}`)
      )
    );
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
    // if (currentViewState?.type !== "grid") return [];

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
  }, [allEvents]);

  const [selectedEvent, setSelectedEvent] = useState<
    RouterOutputs["lists"]["getEventsList"]["rows"][number] | null
  >(null);

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
      <div className="h-full flex">
        <div className="w-64 border-r shrink-0 pt-4 px-6 h-full">
          <div className="flex items-center mb-2">
            <div className="text-sm font-medium text-emphasis-foreground">
              Views
            </div>
            <button
              className="rounded-md flex items-center p-0.5 ml-1 data-[state=open]:bg-muted hover:bg-muted transition"
              onClick={() => {
                const newViewName = `New View ${(views?.length ?? 0) + 1}`;
                createView({
                  name: newViewName,
                  config: {
                    type: "feed",
                    filters: [],
                  },
                })
                  .then(() => refetchViews())
                  .then(() => {
                    toast({
                      title: "New view created successfully",
                    });
                  })
                  .catch(handleError);
              }}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <SidebarButton
            onClick={() =>
              router.push({
                pathname: router.pathname,
                query: { ...router.query, view: undefined },
              })
            }
            selected={!selectedViewId}
          >
            All Events
          </SidebarButton>
          {views?.map((view) => (
            <SidebarButton
              key={view.id}
              onClick={() =>
                router.push({
                  pathname: router.pathname,
                  query: { ...router.query, view: view.id },
                })
              }
              selected={view.id === selectedViewId}
            >
              {view.name}
            </SidebarButton>
          ))}
        </div>
        <div className="h-full grow overflow-auto flex flex-col">
          <div className="shrink-0">
            <EditEventView
              view={selectedView}
              onViewChange={(newView) => {
                if (selectedView) {
                  updateView({
                    id: selectedView.id,
                    name: newView.name,
                    config: newView.config,
                  })
                    .then(() => refetchViews())
                    .catch(handleError);
                }
              }}
              extraFilters={currentViewState.filters}
              onExtraFiltersChange={(filters) => {
                setCurrentViewState((prev) => {
                  return {
                    ...prev,
                    filters,
                  };
                });
              }}
              onDropdownClick={(val) => {
                if (val === "viewConfig") {
                  if (selectedView) {
                    updateView({
                      id: selectedView.id,
                      name: selectedView.name,
                      config: {
                        ...currentViewState,
                        filters: selectedView.config.filters,
                      },
                    })
                      .then(() => refetchViews())
                      .then(() => {
                        toast({
                          title: "View config saved successfully",
                        });
                      })
                      .catch(handleError);
                  }
                } else if (val === "delete") {
                  if (selectedView) {
                    deleteView({ id: selectedView.id })
                      .then(() => refetchViews())
                      .then(() => {
                        toast({
                          title: "View deleted successfully",
                        });
                      })
                      .catch(handleError);
                  }
                }
              }}
              renderRightItems={() => {
                return (
                  <div className="flex items-center gap-2">
                    {currentViewState.type === "feed" ? null : (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setIsEditing((prev) => !prev);
                        }}
                      >
                        {isEditing ? "Done" : "Edit Grid"}
                      </Button>
                    )}
                    <Tabs
                      value={viewConfig?.type}
                      onValueChange={(newType) => {
                        setCurrentViewState((prev) => {
                          return {
                            ...prev,
                            type: newType as "grid" | "feed",
                          };
                        });
                      }}
                    >
                      <TabsList className="p-0.5">
                        <TabsTrigger className="px-2" value="grid">
                          <LayoutGrid className="h-4 w-4" />
                        </TabsTrigger>
                        <TabsTrigger className="px-2" value="feed">
                          <List className="h-4 w-4" />
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                );
              }}
            />
          </div>
          <div className="grow overflow-y-auto">
            {eventsLoading ? (
              <Loader2Icon className="w-8 h-8 text-muted-foreground animate-spin self-center" />
            ) : (
              <div className="relative flex-grow h-full overflow-y-auto">
                <ScrollArea className="">
                  {currentViewState?.type === "feed" ? (
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
                    (isEditing ? listItems.slice(0, 10) : listItems).map(
                      (item, idx) =>
                        item.type === "event" ? (
                          <EventCard
                            key={item.event.id}
                            event={item.event}
                            isFirst={idx === 0}
                            isLast={idx === listItems.length - 1}
                            entityNameMap={entityNameMap}
                            config={
                              currentViewState?.gridConfig?.[
                                item.event.type
                              ] ?? {
                                featureOrder: {},
                                entityTypeOrder: [],
                              }
                            }
                            onConfigChange={(newConfig) => {
                              setCurrentViewState({
                                ...currentViewState,
                                gridConfig: {
                                  ...currentViewState.gridConfig,
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
          </div>
        </div>
      </div>

      {/* <div className="absolute bottom-0 left-0 h-8 w-full bg-gradient-to-t from-background pointer-events-none"></div> */}
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

export function EditEventView(props: {
  view: EventView | undefined;
  onViewChange: (value: EventView) => void;

  extraFilters?: EventFilter[];
  onExtraFiltersChange?: (filters: EventFilter[]) => void;

  onDropdownClick?: (dropdownValue: string) => void;

  renderRightItems?: () => React.ReactNode;
}) {
  const {
    view: initState,
    onViewChange,
    extraFilters,
    onExtraFiltersChange,
    renderRightItems,
    onDropdownClick,
  } = props;

  const [editState, setEditState] = useState<EventView | undefined>(initState);

  const resetState = useCallback(() => {
    setEditState(initState);
  }, [initState]);

  useEffect(() => {
    resetState();
  }, [resetState]);

  const [isEditing, setIsEditing] = useState(false);

  const allFilters = useMemo(() => {
    return [
      ...(editState?.config?.filters ?? []),
      ...(extraFilters ?? []),
    ] as EventFilter[];
  }, [editState, extraFilters]);

  return (
    <div
      className={cn({
        "flex flex-col flex-grow overflow-auto transition": true,
        "bg-gray-50": isEditing,
      })}
    >
      <div className="flex items-center h-14 px-8 border-b shrink-0">
        {isEditing ? (
          <div className="mr-4">
            <Input
              inputSize="md"
              value={editState?.name ?? ""}
              onChange={(e) => {
                setEditState((prev) => {
                  if (!prev) return prev;
                  return { ...prev, name: e.target.value };
                });
              }}
              className="max-w-sm font-bold"
            />
          </div>
        ) : initState ? (
          <>
            <div className="text-emphasis-foreground text-md">
              {initState?.name}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="mr-4">
                <Button size="iconXs" variant="link" className="shrink-0">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                  Edit filters
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onDropdownClick?.("viewConfig")}
                >
                  Save view config
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onDropdownClick?.("delete")}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : null}

        <div className="flex items-center flex-wrap z-0">
          {initState && (
            <>
              <RenderEventFilters
                filters={editState?.config?.filters ?? []}
                onFiltersChange={(filters) => {
                  setEditState((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      config: { ...prev.config, filters },
                    };
                  });
                }}
                editable={isEditing}
                renderWrapper={(children, idx) => {
                  return (
                    <div
                      className={cn({
                        "bg-accent pr-0 flex items-center self-stretch h-8":
                          true,
                        "p-1": idx >= 0,
                      })}
                    >
                      {children}
                    </div>
                  );
                }}
              />
              {isEditing && (
                <div className="self-stretch flex items-center bg-accent pl-1">
                  <EditEventFilters
                    value={editState?.config?.filters ?? []}
                    onChange={(filters) => {
                      setEditState((prev) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          config: { ...prev.config, filters },
                        };
                      });
                    }}
                  />
                </div>
              )}

              <div className="bg-accent -skew-x-[17deg] w-3 -translate-x-1 self-stretch -z-10"></div>
            </>
          )}
          {isEditing ? null : (
            <>
              <RenderEventFilters
                filters={extraFilters ?? []}
                onFiltersChange={(filters) => {
                  onExtraFiltersChange?.(filters);
                }}
                editable={!isEditing}
                renderWrapper={(children, idx) => {
                  return (
                    <div
                      className={cn({
                        "pr-0 flex items-center self-stretch h-8": true,
                        "p-1": idx >= 0,
                      })}
                    >
                      {children}
                    </div>
                  );
                }}
                renderPlaceholder={initState ? () => null : undefined}
              />

              <div className="bg-white px-1 self-stretch flex items-center">
                <EditEventFilters
                  existingFilters={allFilters}
                  value={extraFilters ?? []}
                  onChange={(filters) => {
                    onExtraFiltersChange?.(filters);
                  }}
                />
              </div>
            </>
          )}
        </div>

        <div className="ml-auto">{!isEditing && renderRightItems?.()}</div>
      </div>
      {isEditing ? (
        <div className="flex items-center justify-end w-full gap-2 px-8 py-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => {
              resetState();
              setIsEditing(false);
            }}
          >
            Cancel
          </Button>
          <Button
            size="xs"
            onClick={() => {
              if (editState) {
                onViewChange(editState);
              }
              setIsEditing(false);
            }}
          >
            Done
          </Button>
        </div>
      ) : null}
    </div>
  );
}

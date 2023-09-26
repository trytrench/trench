import { Skeleton } from "@chakra-ui/react";

import { Button, Card, Icon, Title } from "@tremor/react";
import clsx from "clsx";
import { uniqBy } from "lodash";
import { AlignJustify, LayoutGrid } from "lucide-react";
import { useMemo, useState } from "react";
import { StringParam, useQueryParam } from "use-query-params";
import { EventCard } from "~/components/EventCard";
import { Filter, useFilters } from "~/components/Filter";
import { Navbar } from "~/components/Navbar";
import { SelectOptionFlat } from "~/components/SelectOptionFlat";
import { RouterOutputs, api } from "~/utils/api";
import { EventListItem } from "../components/EventListItem";
import { EventDrawer } from "../components/EventDrawer";

function EventsPage() {
  const [view, setView] = useState<"grid" | "list">("list");
  const [eventType, setEventType] = useQueryParam("eventType", StringParam);
  const { type, features, labels, sortBy } = useFilters();

  const { data: eventTypes, isLoading: eventTypesLoading } =
    api.labels.getEventTypes.useQuery();

  const { data: eventLabels, isLoading: eventLabelsLoading } =
    api.labels.getEventLabels.useQuery({
      eventType: type,
    });

  const { data: eventFeatures, isLoading: eventFeaturesLoading } =
    api.labels.getEventFeatures.useQuery({
      eventType: type,
    });

  const [limit, setLimit] = useState(100);

  const { data: eventsList, fetchNextPage } =
    api.lists.getEventsList.useInfiniteQuery(
      {
        eventFilters: {
          eventType: type,
          eventLabels: labels,
          eventFeatures: features,
        },
        limit: limit,
      },
      {
        keepPreviousData: true,
        getNextPageParam: (lastPage) => {
          if (lastPage.rows.length < limit) return false;
          const lastRow = lastPage.rows[lastPage.rows.length - 1];
          if (!lastRow) return false;
          return lastRow.timestamp.toISOString();
        },
      }
    );

  const flattenedEvents = useMemo(() => {
    const flat = eventsList?.pages.flatMap((page) => page.rows) ?? [];
    // dedupe

    return uniqBy(flat, (item) => item.id);
  }, [eventsList]);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  return (
    <div className="flex-1 overflow-hidden flex items-stretch">
      <div className="flex-1 w-full flex items-stretch">
        <div className="w-96 shrink-0 flex flex-col items-start bg-tremor-background-muted p-8 border-r border-r-tremor-border">
          <Title>Events</Title>
          {eventFeaturesLoading || eventLabelsLoading || eventTypesLoading ? (
            <Skeleton />
          ) : (
            <Filter
              types={eventTypes}
              labels={eventLabels}
              features={eventFeatures}
            />
          )}
        </div>
        <div className="relative flex-1">
          <div className="flex justify-end py-2 px-4 border-b border-b-tremor-border">
            <div className="flex  bg-tremor-background-subtle rounded-md p-0.5">
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
              "gap-4": view === "grid",
            })}
          >
            {flattenedEvents?.map((event) =>
              view === "list" ? (
                <EventListItem
                  key={event.id}
                  event={event}
                  onClick={() => {
                    setSelectedEventId(event.id);
                  }}
                  selected={selectedEventId === event.id}
                />
              ) : (
                <EventCard key={event.id} event={event} />
              )
            )}

            <div className="h-4"></div>
            <div className="w-full flex justify-center mt-2">
              <Button
                size="xs"
                onClick={() => {
                  fetchNextPage().catch((err) => {
                    console.error(err);
                  });
                }}
              >
                Fetch more events
              </Button>
            </div>
            <div className="h-16 shrink-0"></div>
          </div>
          <div className="absolute bottom-0 left-0 h-8 w-full bg-gradient-to-t from-white pointer-events-none"></div>
        </div>
      </div>
      <EventDrawer
        selectedEventId={selectedEventId}
        isOpen={!!selectedEventId}
        onClose={() => {
          setSelectedEventId(null);
        }}
      />
    </div>
  );
}

function Page() {
  return (
    <>
      <Navbar />
      <EventsPage />
    </>
  );
}

export default Page;

import { Spinner } from "@chakra-ui/react";

import { Button, Card, Icon } from "@tremor/react";
import clsx from "clsx";
import { AlignJustify, LayoutGrid } from "lucide-react";
import { useMemo, useState } from "react";
import { EventCard } from "~/components/EventCard";
import { useFilters } from "~/components/Filter";
import { RouterOutputs, api } from "~/utils/api";
import { EventDrawer } from "../components/EventDrawer";
import { EventListItem } from "../components/EventListItem";

interface Props {
  entityId?: string;
}

export default function EventsList({ entityId }: Props) {
  const [view, setView] = useState<"grid" | "list">("list");
  const { type, features, labels, sortBy } = useFilters();
  const [limit, setLimit] = useState(50);

  const {
    data: events,
    fetchNextPage,
    isLoading: eventsLoading,
    isFetchingNextPage,
  } = api.lists.getEventsList.useInfiniteQuery(
    {
      eventFilters: {
        eventType: type,
        eventLabels: labels,
        eventFeatures: features,
        entityId,
      },
      limit,
    },
    {
      getNextPageParam: (lastPage, pages) => {
        if (lastPage.rows.length < limit) return false;
        return pages.length * limit;
      },
    }
  );

  const allEvents = useMemo(() => {
    return events?.pages.flatMap((page) => page.rows) ?? [];
  }, [events]);

  const [selectedEvent, setSelectedEvent] = useState<
    RouterOutputs["lists"]["getEventsList"]["rows"][number] | null
  >(null);

  return (
    <>
      {selectedEvent && (
        <EventDrawer
          isOpen={!!selectedEvent}
          onClose={() => {
            setSelectedEvent(null);
          }}
          selectedEvent={selectedEvent}
        />
      )}
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
        {eventsLoading ? (
          <Spinner alignSelf="center" mt={3} />
        ) : (
          <>
            {allEvents.map((event) =>
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
          </>
        )}

        <div className="h-16 shrink-0"></div>
      </div>
      <div className="absolute bottom-0 left-0 h-8 w-full bg-gradient-to-t from-white pointer-events-none"></div>
    </>
  );
}

import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  Skeleton,
} from "@chakra-ui/react";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import {
  Badge,
  Bold,
  Button,
  Card,
  Icon,
  List,
  ListItem,
  Text,
  Title,
} from "@tremor/react";
import clsx from "clsx";
import { format } from "date-fns";
import { uniqBy } from "lodash";
import { AlignJustify, LayoutGrid } from "lucide-react";
import { useMemo, useState } from "react";
import { StringParam, useQueryParam } from "use-query-params";
import { EntityCard } from "~/components/EntityCard";
import { EventCard } from "~/components/EventCard";
import { Filter, useFilters } from "~/components/Filter";
import { Navbar } from "~/components/Navbar";
import { SelectOptionFlat } from "~/components/SelectOptionFlat";
import { RouterOutputs, api } from "~/utils/api";

type EventCardProps = {
  event: RouterOutputs["lists"]["getEventsList"]["rows"][number];
  selected?: boolean;
} & React.HTMLAttributes<HTMLButtonElement>;

function truncateObject(obj, maxLength) {
  let result = {};

  function traverse(o) {
    if (typeof o === "object" && o !== null) {
      let str = JSON.stringify(o);
      return str.length > maxLength ? str.substr(0, maxLength) + "..." : str;
    } else if (typeof o === "string") {
      return o; // return string value without quotes
    } else {
      return String(o); // for other types (number, boolean, etc.), convert to string
    }
  }

  for (const key in obj) {
    if (Object.hasOwnProperty.call(obj, key)) {
      result[key] = traverse(obj[key]);
    }
  }

  return result;
}

function EventListItem({ event, selected, ...rest }: EventCardProps) {
  const [eventType] = useQueryParam("eventType", StringParam);
  const { data: eventLabels } = api.labels.getEventLabels.useQuery({
    eventType: eventType ?? undefined,
  });
  return (
    <button
      className={clsx({
        "px-8 w-full flex items-center text-xs font-mono cursor-pointer text-left":
          true,
        "hover:bg-gray-50": !selected,
        "bg-gray-200": selected,
      })}
      {...rest}
    >
      <Text className="w-32 mr-4 whitespace-nowrap shrink-0 text-xs py-1">
        {format(event.timestamp, "MMM d, HH:mm:ss")}
      </Text>
      <Text className="w-28 mr-4 whitespace-nowrap shrink-0 text-xs truncate">
        {event.type}
      </Text>
      {eventLabels?.length ? (
        <span className="w-24 mr-4 overflow-hidden flex gap-1 shrink-0">
          {uniqBy(event.labels, (label) => label.id).map((label) => (
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
        {Object.entries(truncateObject(event.data, 100)).map(([key, value]) => (
          <span key={key}>
            <Bold>{key}: </Bold> {value}{" "}
          </span>
        ))}
      </Text>
    </button>
  );
}

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
            <div className="h-8 shrink-0"></div>
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

function EventDrawer(props: {
  selectedEventId: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { isOpen, selectedEventId, onClose } = props;
  const { data: selectedEventData } = api.lists.getEvent.useQuery(
    { eventId: selectedEventId ?? "" },
    { enabled: !!selectedEventId }
  );

  const [expandData, setExpandData] = useState(false);

  return (
    <Drawer size="lg" isOpen={isOpen} placement="right" onClose={onClose}>
      {/* <DrawerOverlay /> */}
      <DrawerContent transform="none !important">
        <DrawerCloseButton />
        <DrawerHeader>Event</DrawerHeader>

        <DrawerBody>
          <div>
            {selectedEventData?.eventLabels.map((label) => {
              return (
                <Badge
                  key={label.id}
                  color={label.color}
                  className="cursor-pointer"
                >
                  {label.name}
                </Badge>
              );
            })}
          </div>
          <div className="h-4"></div>
          <List>
            <ListItem>
              <span>Time</span>
              <span>
                {selectedEventData?.timestamp &&
                  format(selectedEventData.timestamp, "MMM d, HH:mm:ss a")}
              </span>
            </ListItem>
            <ListItem>
              <span>Type</span>
              <span>{selectedEventData?.type}</span>
            </ListItem>
          </List>
          <div className="h-4"></div>
          <div className="flex items-center gap-4">
            <Text>Data</Text>
            <button
              className="px-2 py-0.5 bg-gray-300 hover:bg-gray-200"
              onClick={() => {
                setExpandData((prev) => !prev);
              }}
            >
              <DotsHorizontalIcon className="w-4 h-4" />
            </button>
          </div>
          {expandData && (
            <code className="text-xs whitespace-pre">
              {JSON.stringify(selectedEventData?.data, null, 2)}
            </code>
          )}

          <div className="h-4"></div>
          <Text>Entities</Text>
          <div className="h-4"></div>
          <div className="flex flex-col gap-2">
            {selectedEventData?.entityLinks.map((link) => {
              const entity = link.entity;
              return (
                <EntityCard
                  key={link.id}
                  entity={{ ...entity, labels: entity.entityLabels }}
                  relation={link.type}
                />
              );
            })}
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
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

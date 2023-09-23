import {
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
} from "@chakra-ui/react";

import { useMemo, useState } from "react";
import { Navbar } from "~/components/Navbar";
import { RouterOutputs, api } from "~/utils/api";
import {
  Badge,
  Card,
  List,
  ListItem,
  Text,
  TextInput,
  Title,
} from "@tremor/react";
import { SelectOptionFlat } from "../components/SelectOptionFlat";
import { ArrayParam, StringParam, useQueryParam } from "use-query-params";
import clsx from "clsx";
import { Select as ChakraReactSelect } from "chakra-react-select";
import { format } from "date-fns";
import { uniqBy } from "lodash";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { useDatasetSelectionStore } from "~/lib/datasetSelectionState";

function processArray(array: (string | null)[] | null | undefined) {
  if (!array) return [];
  return array.filter((item) => item !== null) as string[];
}

type EventCardProps = {
  event: RouterOutputs["lists"]["getEventsList"]["rows"][number];
  selected?: boolean;
} & React.HTMLAttributes<HTMLButtonElement>;

function EventCard({ event, selected, ...rest }: EventCardProps) {
  const [eventType] = useQueryParam("eventType", StringParam);

  const datasetId = useDatasetSelectionStore((state) => state.selection);

  const { data: eventLabels } = api.labels.getEventLabels.useQuery({
    eventType: eventType ?? undefined,
    datasetId,
  });
  return (
    <button
      className={clsx({
        "px-8 w-full flex items-center text-xs font-mono cursor-pointer text-left":
          true,
        "hover:bg-gray-50": !selected,
        "bg-gray-200 font-bold": selected,
      })}
      {...rest}
    >
      <Text className="w-32 mr-4 whitespace-nowrap shrink-0 text-xs py-1">
        {format(event.timestamp, "MM/dd HH:mm:ss a")}
      </Text>
      <Text className="w-28 mr-4 whitespace-nowrap shrink-0 text-xs truncate">
        {event.type}
      </Text>
      {eventLabels?.length ? (
        <span className="w-24 mr-4 overflow-hidden flex gap-1 shrink-0">
          {event.labels.map((label) => (
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

function EventsPage() {
  const [eventType, setEventType] = useQueryParam("eventType", StringParam);

  const datasetId = useDatasetSelectionStore((state) => state.selection);

  const { data: eventTypes } = api.labels.getEventTypes.useQuery();
  const eventTypeOptions =
    eventTypes?.map((eventType) => ({
      label: eventType.name,
      value: eventType.id,
    })) ?? [];

  const [eventLabelsQuery, setEventLabels] = useQueryParam(
    "eventLabel",
    ArrayParam,
    { enableBatching: true }
  );
  const { data: eventLabels } = api.labels.getEventLabels.useQuery({
    eventType: eventType ?? undefined,
    datasetId,
  });
  const eventLabelOptions = useMemo(() => {
    return (
      eventLabels?.map((eventLabel) => ({
        label: eventLabel.name,
        value: eventLabel.id,
        colorScheme: eventLabel.color,
      })) ?? []
    );
  }, [eventLabels]);

  const selectedEventLabelOptions = useMemo(() => {
    return eventLabelOptions.filter((option) => {
      return eventLabelsQuery?.includes(option.value) ?? false;
    });
  }, [eventLabelsQuery, eventLabelOptions]);

  const { data: eventFeatures } = api.labels.getEventFeatures.useQuery({
    eventType: eventType ?? undefined,
    datasetId,
  });

  const [limit, setLimit] = useState(100);

  const { data: eventsList, fetchNextPage } =
    api.lists.getEventsList.useInfiniteQuery(
      {
        eventFilters: {
          eventType: eventType ?? undefined,
          eventLabels: processArray(eventLabelsQuery),
        },
        limit: limit,
        datasetId,
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

          <Text className="font-semibold text-lg mb-2 mt-6">Type</Text>
          <div className="bg-tremor-background-subtle p-1 flex flex-wrap items-center gap-1 rounded-md">
            <SelectOptionFlat
              onSelect={(value) => {
                // Clear eventLabel query param when eventType changes
                setEventLabels(undefined);
              }}
              queryParamKey="eventType"
              options={eventTypeOptions}
              renderOption={(option, { handleClick, selected }) => {
                return (
                  <button
                    onClick={() => handleClick(option.value)}
                    className={clsx({
                      "transition border rounded-md text-base font-semibold":
                        true,
                      "text-tremor-content hover:text-tremor-content-emphasis border-transparent":
                        !selected,
                      "text-tremor-brand bg-white border-gray shadow-sm":
                        selected,
                      "px-2 py-0.5": true,
                    })}
                  >
                    {option.label}
                  </button>
                );
              }}
            />
          </div>

          {eventType && (
            <>
              <Text className="font-semibold text-lg mb-2 mt-6">
                {`\`${eventType}\` `}
                Labels
              </Text>
              {eventLabelOptions.length > 0 ? (
                <ChakraReactSelect
                  className="w-full flex flex-wrap"
                  isMulti
                  isClearable={false}
                  value={selectedEventLabelOptions}
                  onChange={(value) => {
                    setEventLabels(value?.map((option) => option.value));
                  }}
                  options={eventLabelOptions}
                ></ChakraReactSelect>
              ) : (
                <div className="w-full py-1 flex justify-center items-center bg-tremor-background-subtle">
                  <Text className="text-sm text-tremor-content-subtle">
                    No labels to filter by
                  </Text>
                </div>
              )}

              <Text className="font-semibold text-lg mb-2 mt-6">
                {`\`${eventType}\` `}
                Features
              </Text>
              <div className="flex flex-col gap-2">
                {eventFeatures?.map((feature, idx) => {
                  return (
                    <div className="w-full" key={idx}>
                      <Text className="whitespace-no-wrap text-xs">
                        {feature.name}
                      </Text>
                      <TextInput placeholder="Filter..." className="w-full" />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div className="relative flex-1">
          <div className="h-full flex flex-col overflow-y-auto">
            <div className="h-8 shrink-0"></div>

            {flattenedEvents?.map((event) => {
              return (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => {
                    setSelectedEventId(event.id);
                  }}
                  selected={selectedEventId === event.id}
                />
              );
            })}

            <div className="h-4"></div>
            <div className="w-full flex justify-center mt-2">
              <Button
                variant="outline"
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
  const datasetId = useDatasetSelectionStore((state) => state.selection);

  const { isOpen, selectedEventId, onClose } = props;
  const { data: selectedEventData } = api.lists.getEvent.useQuery(
    { eventId: selectedEventId ?? "", datasetId },
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
                  className="py-0 cursor-pointer"
                >
                  <span className="text-xs">{label.name}</span>
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
                <Card key={entity.id} className="p-2">
                  <Text>
                    {link.type}: {entity.type}: {entity.name}
                  </Text>
                  <div className="h-2"></div>
                  <div className="flex flex-wrap gap-1">
                    {entity.entityLabels.length === 0 && (
                      <Badge color="gray" className="py-0 cursor-pointer">
                        <span className="text-xs">No labels</span>
                      </Badge>
                    )}
                    {entity.entityLabels.map((label) => {
                      return (
                        <Badge
                          key={label.id}
                          color={label.color}
                          className="py-0 cursor-pointer"
                        >
                          <span className="text-xs">{label.name}</span>
                        </Badge>
                      );
                    })}
                  </div>
                </Card>
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

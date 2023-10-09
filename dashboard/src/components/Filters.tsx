import {
  MultiSelect,
  MultiSelectItem,
  Select,
  SelectItem,
  Text,
} from "@tremor/react";
import { Select as ChakraReactSelect } from "chakra-react-select";
import dayjs from "dayjs";
import { useMemo } from "react";
import {
  ArrayParam,
  NumberParam,
  StringParam,
  useQueryParam,
  type UrlUpdateType,
} from "use-query-params";
import { type EntityFilters, type EventFilters } from "../shared/validation";
import { api } from "../utils/api";

// const TODAY = dayjs(new Date("08-14-2023"));
const TODAY = dayjs(new Date());

export const DEFAULT_DATE_RANGE = {
  from: TODAY.add(-90, "day").toDate(),
  to: TODAY.toDate(),
};

function processArray(
  prev: (string | null)[] | null | undefined
): string[] | undefined {
  if (!prev) {
    return undefined;
  }
  return prev.filter((v) => v !== null) as string[];
}

export function useEventFilters(override?: Partial<EventFilters>) {
  const [startDate] = useQueryParam("from", NumberParam);
  const [endDate] = useQueryParam("to", NumberParam);
  const [eventLabels] = useQueryParam("eventLabel", ArrayParam);
  const [eventType] = useQueryParam("eventType", StringParam);

  const allFilters: EventFilters = useMemo(() => {
    return {
      dateRange: {
        from: startDate ?? DEFAULT_DATE_RANGE.from.getTime(),
        to: endDate ?? DEFAULT_DATE_RANGE.to.getTime(),
      },
      eventLabels: processArray(eventLabels),
      eventType: eventType ?? undefined,
      ...override,
    };
  }, [endDate, eventLabels, eventType, override, startDate]);

  return allFilters;
}

export function useEntityFilters(override?: Partial<EntityFilters>) {
  const [entityLabels] = useQueryParam("entityLabel", ArrayParam);
  const [entityType] = useQueryParam("entityType", StringParam);

  const allFilters: EntityFilters = useMemo(() => {
    return {
      entityLabels: processArray(entityLabels),
      entityType: entityType ?? undefined,
      entityId: undefined,
      ...override,
    };
  }, [entityLabels, entityType, override]);

  return allFilters;
}

interface EventTypeFilterProps {
  showLabelFilter?: boolean;
  datasetId: string;
}
export function EventTypeFilter(props: EventTypeFilterProps) {
  const { showLabelFilter = false, datasetId } = props;

  // Options
  const { data: eventTypesData } = api.labels.getEventTypes.useQuery({
    datasetId,
  });
  const eventTypeOptions = useMemo(
    () =>
      eventTypesData?.map((eventType) => ({
        label: eventType.id,
        value: eventType.name,
      })) ?? [],
    [eventTypesData]
  );

  const [eventType, setEventType] = useQueryParam("eventType", StringParam);

  const { data: eventLabelsData } = api.labels.getEventLabels.useQuery({
    eventType: eventType ?? undefined,
    datasetId,
  });
  const eventLabelOptions = useMemo(
    () =>
      eventLabelsData?.map((eventLabel) => ({
        label: eventLabel.name,
        value: eventLabel.id,
      })) ?? [],
    [eventLabelsData]
  );

  const [eventLabels, setEventLabels] = useQueryParam("eventLabel", ArrayParam);

  return (
    <div className="flex items-center gap-4 shrink-0">
      <Select
        className="w-48"
        value={eventType ?? undefined}
        onValueChange={setEventType}
        placeholder="All events"
        enableClear
      >
        {eventTypeOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </Select>
      {eventType && showLabelFilter && (
        <>
          <Text className="font-normal whitespace-nowrap">with label</Text>
          <div className="shrink-0">
            <MultiSelect
              value={processArray(eventLabels) ?? []}
              onValueChange={(newValue) => {
                setEventLabels(newValue, "pushIn");
              }}
              placeholder="any"
            >
              {eventLabelOptions.map((option) => (
                <MultiSelectItem key={option.value} value={option.value}>
                  {option.label}
                </MultiSelectItem>
              ))}
            </MultiSelect>
          </div>
        </>
      )}
    </div>
  );
}

export function EntityTypeFilter({ datasetId }: { datasetId: string }) {
  // Options
  const { data: entityTypesData } = api.labels.getEntityTypes.useQuery(
    {
      datasetId,
    },
    { enabled: !!datasetId }
  );
  const entityTypeOptions = useMemo(
    () =>
      entityTypesData?.map((entityType) => ({
        label: entityType.id,
        value: entityType.id,
      })) ?? [],
    [entityTypesData]
  );

  const [entityType, setEntityType] = useQueryParam("entityType", StringParam);
  const selectedEntityType = useMemo(
    () =>
      entityType
        ? {
            label: entityType,
            value: entityType,
          }
        : null,
    [entityType]
  );

  const { data: entityLabelsData } = api.labels.getEntityLabels.useQuery({
    entityType: entityType ?? undefined,
    datasetId,
  });
  const entityLabelOptions = useMemo(
    () =>
      entityLabelsData?.map((entityLabel) => ({
        label: entityLabel.id,
        value: entityLabel.id,
      })) ?? [],
    [entityLabelsData]
  );

  const [entityLabels, setEntityLabels] = useQueryParam(
    "entityLabel",
    ArrayParam
  );

  const selectedEntityLabels = useMemo(
    () =>
      entityLabels
        ? entityLabels.map((entityLabel) => ({
            label: entityLabel,
            value: entityLabel,
          }))
        : [],
    [entityLabels]
  );

  return (
    <div className="flex gap-4 items-center font-bold">
      <ChakraReactSelect
        isClearable
        value={selectedEntityType}
        onChange={(option) => {
          if (option?.value) {
            setEntityType(option?.value);
          } else {
            setEntityType(undefined);
          }
        }}
        placeholder="All entities"
        options={entityTypeOptions}
      />
      {entityType && (
        <>
          <span className="font-normal">with label</span>
          <ChakraReactSelect
            isMulti
            value={selectedEntityLabels}
            onChange={createHandleLabelChange(setEntityLabels)}
            placeholder="any"
            options={entityLabelOptions}
          />
        </>
      )}
    </div>
  );
}

const createHandleLabelChange = (
  setLabels: (labels: string[], updateType?: UrlUpdateType) => void
) => {
  return (
    newLabels: readonly ({ label: string; value: string } | undefined)[] | null
  ) => {
    if (!newLabels) {
      setLabels([], "pushIn");
      return;
    }
    const labels = newLabels
      .map((label) => label?.value)
      .filter(Boolean) as string[];
    setLabels(labels, "pushIn");
  };
};

export function EventLabelFilter({ datasetId }: { datasetId: string }) {
  // Options
  const [eventType] = useQueryParam("eventType", StringParam);
  const { data: eventLabelsData } = api.labels.getEventLabels.useQuery({
    eventType: eventType ?? undefined,
    datasetId,
  });
  const eventLabelOptions = useMemo(
    () =>
      eventLabelsData?.map((eventLabel) => ({
        label: eventLabel.id,
        value: eventLabel.id,
      })) ?? [],
    [eventLabelsData]
  );

  const [eventLabels, setEventLabels] = useQueryParam("eventLabel", ArrayParam);
  const selectedEventLabels = useMemo(
    () =>
      eventLabels
        ? eventLabels.map((eventLabel) => ({
            label: eventLabel,
            value: eventLabel,
          }))
        : [],
    [eventLabels]
  );

  return (
    <ChakraReactSelect
      isMulti
      value={selectedEventLabels}
      onChange={createHandleLabelChange(setEventLabels)}
      placeholder="Filter by Event Label"
      options={eventLabelOptions}
    />
  );
}

export function EntityLabelFilter({ datasetId }: { datasetId: string }) {
  // Options
  const [entityType] = useQueryParam("entityType", StringParam);
  const { data: entityLabelsData } = api.labels.getEntityLabels.useQuery({
    entityType: entityType ?? undefined,
    datasetId,
  });
  const entityLabelOptions = useMemo(
    () =>
      entityLabelsData?.map((entityLabel) => ({
        label: entityLabel.id,
        value: entityLabel.id,
      })) ?? [],
    [entityLabelsData]
  );

  const [entityLabels, setEntityLabels] = useQueryParam(
    "entityLabel",
    ArrayParam
  );

  const selectedEntityLabels = useMemo(
    () =>
      entityLabels
        ? entityLabels.map((entityLabel) => ({
            label: entityLabel,
            value: entityLabel,
          }))
        : [],
    [entityLabels]
  );

  return (
    <ChakraReactSelect
      isMulti
      value={selectedEntityLabels}
      onChange={createHandleLabelChange(setEntityLabels)}
      placeholder="Filter by Entity Label"
      options={entityLabelOptions}
    />
  );
}

const HOUR_TIME = 1000 * 60 * 60;
const intervalOptions = [
  { label: "1 hour", value: HOUR_TIME },
  { label: "3 hours", value: HOUR_TIME * 3 },
  { label: "12 hours", value: HOUR_TIME * 12 },
  { label: "24 hours", value: HOUR_TIME * 24 },
] as const;
const DEFAULT_INTERVAL = HOUR_TIME * 24;

export function useTimeInterval() {
  const [interval, setInterval] = useQueryParam("interval", NumberParam);
  return interval ?? DEFAULT_INTERVAL;
}
export function IntervalPicker() {
  const [interval, setInterval] = useQueryParam("interval", NumberParam);

  const selectedInterval = useMemo(() => {
    const intvl = interval ?? DEFAULT_INTERVAL;
    return intervalOptions.find((option) => option.value === intvl);
  }, [interval]);

  return (
    <Select
      className="w-48"
      value={selectedInterval?.label}
      onValueChange={(val) =>
        setInterval(
          intervalOptions.find((option) => option.label === val)?.value
        )
      }
      placeholder="24 hours"
      enableClear
    >
      {intervalOptions.map((option) => (
        <SelectItem key={option.value} value={option.label}>
          {option.label}
        </SelectItem>
      ))}
    </Select>
  );
}

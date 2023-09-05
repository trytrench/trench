import { addDays } from "date-fns";
import {
  ArrayParam,
  NumberParam,
  type UrlUpdateType,
  useQueryParam,
  useQueryParams,
  StringParam,
  BooleanParam,
} from "use-query-params";
import { type EntityFilters, type EventFilters } from "../shared/validation";
import { useMemo, useState } from "react";
import { api } from "../utils/api";
import { type OptionBase, Select, type SingleValue } from "chakra-react-select";
import { Checkbox, HStack, Input, SelectField } from "@chakra-ui/react";
import { ArrowRightIcon } from "lucide-react";
import { isArray } from "lodash";
import {
  DatePicker as AntdDatePicker,
  Space,
  type TimeRangePickerProps,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";

const { RangePicker } = AntdDatePicker;

const TODAY = dayjs(new Date("08-14-2023"));

const DEFAULT_DATE_RANGE = {
  from: TODAY.add(-7, "day").toDate(),
  to: TODAY.toDate(),
};

function processArray(
  prev: (string | null)[] | null | undefined
): string[] | null {
  if (!prev) {
    return null;
  }
  return prev.filter((v) => v !== null) as string[];
}

export function useEventFilters(override?: Partial<EventFilters>) {
  const [startDate] = useQueryParam("start", NumberParam);
  const [endDate] = useQueryParam("end", NumberParam);
  const [eventLabels] = useQueryParam("eventLabel", ArrayParam);
  const [eventType] = useQueryParam("eventType", StringParam);

  const allFilters: EventFilters = useMemo(() => {
    return {
      dateRange: {
        start: startDate ?? DEFAULT_DATE_RANGE.from.getTime(),
        end: endDate ?? DEFAULT_DATE_RANGE.to.getTime(),
      },
      eventLabels: processArray(eventLabels),
      eventType: eventType ?? null,
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
      entityType: entityType ?? null,
      entityId: null,
      ...override,
    };
  }, [entityLabels, entityType, override]);

  return allFilters;
}

const rangePresets: TimeRangePickerProps["presets"] = [
  {
    label: "Last 7 Days",
    value: [TODAY.add(-7, "d").startOf("day"), TODAY.endOf("day")],
  },
  {
    label: "Last 14 Days",
    value: [TODAY.add(-14, "d").startOf("day"), TODAY.endOf("day")],
  },
  {
    label: "Last 30 Days",
    value: [TODAY.add(-30, "d").startOf("day"), TODAY.endOf("day")],
  },
  {
    label: "Last 90 Days",
    value: [TODAY.add(-90, "d").startOf("day"), TODAY.endOf("day")],
  },
];

export function EventTypeFilter() {
  // Options
  const { data: eventTypesData } = api.labels.getEventTypes.useQuery();
  const eventTypeOptions = useMemo(
    () =>
      eventTypesData?.map((eventType) => ({
        label: eventType.id,
        value: eventType.id,
      })) ?? [],
    [eventTypesData]
  );

  const [eventType, setEventType] = useQueryParam("eventType", StringParam);
  const selectedEventType = useMemo(
    () =>
      eventType
        ? {
            label: eventType,
            value: eventType,
          }
        : null,
    [eventType]
  );

  return (
    <Select
      isClearable
      value={selectedEventType}
      onChange={(option) => {
        if (option?.value) {
          setEventType(option?.value);
        } else {
          setEventType(undefined);
        }
      }}
      placeholder="Filter by Event Type"
      options={eventTypeOptions}
    />
  );
}

export function EntityTypeFilter() {
  // Options
  const { data: entityTypesData } = api.labels.getEntityTypes.useQuery();
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

  return (
    <Select
      isClearable
      value={selectedEntityType}
      onChange={(option) => {
        if (option?.value) {
          setEntityType(option?.value);
        } else {
          setEntityType(undefined);
        }
      }}
      placeholder="Filter by Entity Type"
      options={entityTypeOptions}
    />
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

export function EventLabelFilter() {
  // Options
  const { data: eventLabelsData } = api.labels.getEventLabels.useQuery();
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
    <Select
      isMulti
      value={selectedEventLabels}
      onChange={createHandleLabelChange(setEventLabels)}
      placeholder="Filter by Event Label"
      options={eventLabelOptions}
    />
  );
}

export function EntityLabelFilter() {
  // Options
  const { data: entityLabelsData } = api.labels.getEntityLabels.useQuery();
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
    <Select
      isMulti
      value={selectedEntityLabels}
      onChange={createHandleLabelChange(setEntityLabels)}
      placeholder="Filter by Entity Label"
      options={entityLabelOptions}
    />
  );
}

export function DateRangePicker() {
  const [showTime, setShowTime] = useQueryParam("showTime", BooleanParam);

  const [dateRangeQuery, setDateRangeQuery] = useQueryParams({
    start: NumberParam,
    end: NumberParam,
  });

  type RangeValue = [Dayjs | null, Dayjs | null] | null;
  const dateRangeValue: RangeValue = useMemo(() => {
    return [
      dateRangeQuery.start ? dayjs(new Date(dateRangeQuery.start)) : null,
      dateRangeQuery.end ? dayjs(new Date(dateRangeQuery.end)) : null,
    ];
  }, [dateRangeQuery]);

  return (
    <div className="flex col-span-2 gap-4">
      <RangePicker
        size="large"
        allowClear
        presets={rangePresets}
        showNow
        showTime={showTime ? { format: "h:mm a" } : undefined}
        format={showTime ? "MMM DD, h:mm a" : "MMM Do"}
        value={dateRangeValue}
        onChange={(val) => {
          if (isArray(val)) {
            if (showTime) {
              setDateRangeQuery({
                start: val[0]?.toDate().getTime(),
                end: val[1]?.toDate().getTime(),
              });
            } else {
              setDateRangeQuery({
                start: val[0]?.startOf("day").toDate().getTime(),
                end: val[1]?.endOf("day").toDate().getTime(),
              });
            }
          } else if (!val) {
            setDateRangeQuery({
              start: undefined,
              end: undefined,
            });
          }
        }}
      />
      <Checkbox
        checked={!!showTime}
        onChange={(e) => {
          setShowTime(e.target.checked);
        }}
      >
        Filter by exact times
      </Checkbox>
    </div>
  );
}

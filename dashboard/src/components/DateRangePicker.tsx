import {
  DateRangePickerItem,
  DateRangePicker as TremorDateRangePicker,
  type DateRangePickerProps,
} from "@tremor/react";
import { endOfDay, startOfDay, sub } from "date-fns";

const TODAY = new Date();

export function DateRangePicker(props: DateRangePickerProps) {
  return (
    <TremorDateRangePicker {...props}>
      <DateRangePickerItem
        key="today"
        value="today"
        from={startOfDay(TODAY)}
        to={endOfDay(TODAY)}
      >
        Today
      </DateRangePickerItem>
      <DateRangePickerItem
        key="last3Days"
        value="last3Days"
        from={startOfDay(sub(TODAY, { days: 3 }))}
        to={endOfDay(TODAY)}
      >
        Last 3 Days
      </DateRangePickerItem>
      <DateRangePickerItem
        key="last7Days"
        value="last7Days"
        from={startOfDay(sub(TODAY, { days: 7 }))}
        to={endOfDay(TODAY)}
      >
        Last 7 Days
      </DateRangePickerItem>
      <DateRangePickerItem
        key="last14Days"
        value="last14Days"
        from={startOfDay(sub(TODAY, { days: 14 }))}
        to={endOfDay(TODAY)}
      >
        Last 14 Days
      </DateRangePickerItem>
      <DateRangePickerItem
        key="last30Days"
        value="last30Days"
        from={startOfDay(sub(TODAY, { days: 30 }))}
        to={endOfDay(TODAY)}
      >
        Last 30 Days
      </DateRangePickerItem>
      <DateRangePickerItem
        key="last90Days"
        value="last90Days"
        from={startOfDay(sub(TODAY, { days: 90 }))}
        to={endOfDay(TODAY)}
      >
        Last 90 Days
      </DateRangePickerItem>
    </TremorDateRangePicker>
  );
}

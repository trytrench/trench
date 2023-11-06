import { type DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { format, isEqual } from "date-fns";

export const formatSelectedDates = (
  startDate: Date | undefined,
  endDate: Date | undefined,
  locale?: Locale,
  displayFormat?: string
) => {
  const localeCode = locale?.code ?? "en-US";
  if (!startDate && !endDate) {
    return "";
  } else if (startDate && !endDate) {
    if (displayFormat) return format(startDate, displayFormat);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return startDate.toLocaleDateString(localeCode, options);
  } else if (startDate && endDate) {
    if (isEqual(startDate, endDate)) {
      if (displayFormat) return format(startDate, displayFormat);
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
      };
      return startDate.toLocaleDateString(localeCode, options);
    } else if (
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getFullYear() === endDate.getFullYear()
    ) {
      if (displayFormat)
        return `${format(startDate, displayFormat)} - ${format(
          endDate,
          displayFormat
        )}`;

      const optionsStartDate: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "numeric",
      };
      return `${startDate.toLocaleDateString(localeCode, optionsStartDate)} - 
                    ${endDate.getDate()}, ${endDate.getFullYear()}`;
    } else {
      if (displayFormat)
        return `${format(startDate, displayFormat)} - ${format(
          endDate,
          displayFormat
        )}`;
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
      };
      return `${startDate.toLocaleDateString(localeCode, options)} - 
                    ${endDate.toLocaleDateString(localeCode, options)}`;
    }
  }
  return "";
};

export function EmbeddedDatePicker(props: {
  dateRange: DateRange | undefined;
  onDateRangeChange: (dateRange: DateRange | undefined) => void;
}) {
  const { dateRange, onDateRangeChange } = props;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline text-sm bg-muted rounded-sm px-3 py-1 hover:bg-muted/80">
          {formatSelectedDates(dateRange?.from, dateRange?.to)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={onDateRangeChange}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}

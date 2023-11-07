import { type DateRange } from "react-day-picker";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "../../ui/popover";
import { Calendar } from "../../ui/calendar";
import { add, format, isEqual } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Separator } from "../../ui/separator";
import { ChevronDown } from "lucide-react";

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

const SET_TIME_RANGES = [
  {
    label: "Last 7 days",
    range: {
      from: add(new Date(), { days: -7 }),
      to: new Date(),
    },
  },
  {
    label: "Last 30 days",
    range: {
      from: add(new Date(), { days: -30 }),
      to: new Date(),
    },
  },
  {
    label: "Last 90 days",
    range: {
      from: add(new Date(), { days: -90 }),
      to: new Date(),
    },
  },
];

export function EmbeddedDatePicker(props: {
  dateRange: DateRange | undefined;
  onDateRangeChange: (dateRange: DateRange | undefined) => void;
}) {
  const { dateRange, onDateRangeChange } = props;

  const defaultMonth = add(dateRange?.to ?? new Date(), { months: -1 });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline text-sm bg-muted rounded-sm px-3 py-1 hover:brightness-150 data-[state=open]:brightness-150 transition">
          {formatSelectedDates(dateRange?.from, dateRange?.to)}
          <ChevronDown className="inline ml-1.5 -mr-1.5 h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto flex items-stretch p-0">
        <div className="flex flex-col text-sm">
          <div className="h-2"></div>
          {SET_TIME_RANGES.map((timeRange, idx) => (
            <PopoverClose key={idx}>
              <button
                className="block font-medium w-full text-left px-4 pr-12 py-2 hover:bg-muted/80"
                onClick={() => {
                  onDateRangeChange(timeRange.range);
                }}
              >
                {timeRange.label}
              </button>
            </PopoverClose>
          ))}
        </div>
        <Separator orientation="vertical" className="h-auto" />
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={onDateRangeChange}
          numberOfMonths={2}
          disabled={{ after: new Date() }}
          toMonth={new Date()}
          defaultMonth={defaultMonth}
        />
      </PopoverContent>
    </Popover>
  );
}

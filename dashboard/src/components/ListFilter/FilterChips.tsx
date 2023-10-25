import { cn } from "~/lib/utils";
import { Badge } from "../ui/badge";
import { ChevronDown, Sparkles, X } from "lucide-react";
import { JsonFilter } from "~/shared/jsonFilter";
import { getAvailableOps, getParamSchema } from "./helpers";
import type { DateRange } from "react-day-picker";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ParamSchema } from "./typeData";
import { useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Input } from "../ui/input";

// Type

interface TypeChipProps extends React.ComponentPropsWithoutRef<"div"> {
  type: string;
  onDelete?: () => void;
}

const TypeChip = ({ type, onDelete, className, ...props }: TypeChipProps) => {
  return (
    <Badge
      variant="outline"
      className={cn(
        "flex pr-2 animate-in zoom-in-95 fade-in-20 bg-card",
        className
      )}
    >
      Type: {type}
      <button
        className="ml-1 rounded-full flex items-center"
        onClick={onDelete}
      >
        <X className="h-3 w-3 my-auto" />
      </button>
    </Badge>
  );
};

// Label

interface LabelChipProps extends React.ComponentPropsWithoutRef<"div"> {
  label: string;
  onDelete?: () => void;
}

const LabelChip = ({
  label,
  onDelete,
  className,
  ...props
}: LabelChipProps) => {
  return (
    <Badge
      variant="default"
      className={cn("flex pr-2 animate-in zoom-in-95 fade-in-20", className)}
    >
      {label}
      <button
        className="ml-1 rounded-full flex items-center"
        onClick={onDelete}
      >
        <X className="h-3 w-3 my-auto" />
      </button>
    </Badge>
  );
};

// Date Range

interface DateRangeChipProps extends React.ComponentPropsWithoutRef<"div"> {
  dateRange: DateRange;
  onDelete?: () => void;
}

const DateRangeChip = ({
  dateRange,
  onDelete,
  className,
  ...props
}: DateRangeChipProps) => {
  let dateRangeString = "--";

  if (dateRange.from && dateRange.to) {
    dateRangeString = `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`;
  }

  return (
    <Badge
      variant="default"
      className={cn("flex pr-2 animate-in zoom-in-95 fade-in-20", className)}
    >
      Date Range: {dateRangeString}
      <button
        className="ml-1 rounded-full flex items-center"
        onClick={onDelete}
      >
        <X className="h-3 w-3 my-auto" />
      </button>
    </Badge>
  );
};

// JsonFilter Chip (the big one)

interface JsonFilterChipProps extends React.ComponentPropsWithoutRef<"div"> {
  value: { id: string; filter: JsonFilter };
  onValueChange?: (value: { id: string; filter: JsonFilter }) => void;
  onDelete?: () => void;
}

const JsonFilterChip = ({
  value,
  onValueChange,
  onDelete,
  className,
  ...props
}: JsonFilterChipProps) => {
  const { id } = value;
  const { path, op, dataType, value: jsonFilterValue } = value.filter;
  const schema = getParamSchema(dataType, op);

  const availableOps = useMemo(() => getAvailableOps(dataType), [dataType]);

  return (
    <div className="flex animate-in zoom-in-95 fade-in-20">
      <Badge
        variant="outline"
        className={cn("rounded-r-none border-r-none pr-2", className)}
      >
        {path}
      </Badge>

      <Badge
        variant="outline"
        className={cn("rounded-none border-l-0 p-0 cursor-pointer", className)}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <span className="flex pr-1.5 pl-2">
              {op}
              <ChevronDown className="h-3 w-3 my-auto ml-1" />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {availableOps.map((op) => (
              <DropdownMenuItem
                onSelect={() => {
                  if (op === value?.filter?.op) return;

                  const oldSchema = getParamSchema(dataType, value?.filter?.op);
                  const newSchema = getParamSchema(dataType, op);
                  const keepValue =
                    oldSchema.type === newSchema.type &&
                    oldSchema.count === newSchema.count;

                  onValueChange?.({
                    id: id,
                    filter: {
                      ...value?.filter,
                      op,
                      value: keepValue ? value.filter.value : undefined,
                    },
                  });
                }}
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                {op}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </Badge>

      {schema.type !== "none" && schema.count !== 0 && (
        <Badge
          variant="outline"
          className={cn(
            "rounded-none border-l-0 px-2 cursor-pointer",
            className
          )}
        >
          <ValuePicker
            value={jsonFilterValue}
            schema={schema}
            onValueChange={(newVal) => {
              onValueChange?.({
                id: id,
                filter: { ...value.filter, value: newVal },
              });
            }}
          />
        </Badge>
      )}
      <Badge
        variant="outline"
        className={cn("rounded-l-none border-l-0 pr-1.5 pl-1", className)}
      >
        <button className="rounded-full flex items-center" onClick={onDelete}>
          <X className="h-3 w-3 my-auto" />
        </button>
      </Badge>
    </div>
  );
};

interface ValuePickerProps {
  schema: ParamSchema;
  value: any | undefined;
  onValueChange: (value: any) => void;
}

const ValuePicker = (props: ValuePickerProps) => {
  const { schema, value, onValueChange } = props;

  if (schema.type === "none") {
    return null;
  }
  if (schema.type === "boolean") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div>
            {value === undefined ? (
              <span className="italic opacity-50">empty</span>
            ) : (
              `${JSON.stringify(value)}`
            )}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => onValueChange(true)}>
            true
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onValueChange(false)}>
            false
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  if (schema.type === "text") {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div>
            {value === undefined ? (
              <span className="italic opacity-50">empty</span>
            ) : (
              `'${value}'`
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent align="start">
          <Input
            value={value}
            onChange={(e) => {
              onValueChange(e.target.value);
            }}
          />
        </PopoverContent>
      </Popover>
    );
  }
  if (schema.type === "number") {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div>
            {value === undefined ? (
              <span className="italic opacity-50">empty</span>
            ) : (
              `${value}`
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent align="start">
          <Input
            type="number"
            value={value}
            onChange={(e) => {
              if (e.target.value === "" || isNaN(Number(e.target.value))) {
                onValueChange(undefined);
              } else {
                onValueChange(Number(e.target.value));
              }
            }}
          />
        </PopoverContent>
      </Popover>
    );
  }
};

export { TypeChip, LabelChip, DateRangeChip, JsonFilterChip };

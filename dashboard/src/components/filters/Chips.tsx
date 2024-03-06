import { X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Badge } from "../ui/badge";

import { useEffect, useMemo, useState } from "react";
import { DateRange, type FeatureFilter } from "../../shared/validation";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { TypeName } from "event-processing";
import { z } from "zod";

// Type

interface TypeChipProps extends React.ComponentPropsWithoutRef<"div"> {
  type: string;
  onDelete?: () => void;
  title?: string;
  isEditable?: boolean;
}

const TypeChip = ({
  type,
  onDelete,
  className,
  title = "Type",
  isEditable = false,
}: TypeChipProps) => {
  return (
    <Badge variant="outline" className={cn("flex pr-2 bg-card", className)}>
      {title}: {type}
      {isEditable && (
        <button
          className="ml-1 rounded-full flex items-center"
          onClick={onDelete}
        >
          <X className="h-3 w-3 my-auto" />
        </button>
      )}
    </Badge>
  );
};

// Label

interface LabelChipProps extends React.ComponentPropsWithoutRef<"div"> {
  label: string;
  onDelete?: () => void;
  isEditable?: boolean;
}

const LabelChip = ({
  label,
  onDelete,
  className,
  isEditable = false,
  ...props
}: LabelChipProps) => {
  return (
    <Badge variant="default" className={cn("flex pr-2", className)}>
      {label}
      {isEditable && (
        <button
          className="ml-1 rounded-full flex items-center"
          onClick={onDelete}
        >
          <X className="h-3 w-3 my-auto" />
        </button>
      )}
    </Badge>
  );
};

// Date Range

interface DateRangeChipProps extends React.ComponentPropsWithoutRef<"div"> {
  dateRange: DateRange;
  title?: string;
  onDelete?: () => void;
  isEditable?: boolean;
}

const DateRangeChip = ({
  dateRange,
  title = "Date Range",
  onDelete,
  className,
  isEditable = false,
}: DateRangeChipProps) => {
  let dateRangeString = "--";
  console.log(dateRange);
  if (dateRange.from && dateRange.to) {
    dateRangeString = `${dateRange.from?.toLocaleDateString()} - ${dateRange.to?.toLocaleDateString()}`;
  }

  return (
    <Badge variant="outline" className={cn("flex bg-card pr-2", className)}>
      {title}: {dateRangeString}
      {isEditable && (
        <button
          className="ml-1 rounded-full flex items-center"
          onClick={onDelete}
        >
          <X className="h-3 w-3 my-auto" />
        </button>
      )}
    </Badge>
  );
};

export function FeatureFilterChip(props: {
  filter: FeatureFilter;
  onChange: (value: FeatureFilter) => void;
  onDelete?: () => void;
  isEditable?: boolean;
}) {
  const { filter, onChange, onDelete, isEditable = false } = props;

  switch (filter?.dataType) {
    case TypeName.Int64:
    case TypeName.Float64: {
      return (
        <NumberFilterChip
          filter={filter}
          onChange={onChange}
          onDelete={onDelete}
          isEditable={isEditable}
        />
      );
    }
    case TypeName.Name:
    case TypeName.String: {
      return (
        <StringFilterChip
          filter={filter}
          onChange={onChange}
          onDelete={onDelete}
          isEditable={isEditable}
        />
      );
    }
    case TypeName.Boolean: {
      return (
        <BooleanFilterChip
          filter={filter}
          onChange={onChange}
          onDelete={onDelete}
          isEditable={isEditable}
        />
      );
    }
  }

  return <div>not implemented</div>;
}

const NUMBER_FILTER_OPS = [
  { key: "gt", label: ">" },
  { key: "gte", label: ">=" },
  { key: "lt", label: "<" },
  { key: "lte", label: "<=" },
  { key: "eq", label: "=" },
] as const;

type OpKey = (typeof NUMBER_FILTER_OPS)[number]["key"];

type NumberFilter = Extract<
  FeatureFilter,
  { dataType: TypeName.Int64 | TypeName.Float64 }
>;
function NumberFilterChip(props: {
  filter: NumberFilter;
  onChange: (value: NumberFilter) => void;
  onDelete?: () => void;
  isEditable?: boolean;
}) {
  const { filter, onChange, onDelete, isEditable } = props;

  const [key, setKey] = useState<OpKey | undefined>();
  const [value, setValue] = useState<number | undefined>();

  const opLabel = useMemo(() => {
    if (!key) return "--";
    return NUMBER_FILTER_OPS.find((op) => op.key === key)?.label ?? "--";
  }, [key]);

  useEffect(() => {
    if (!filter) return;
    for (const op of NUMBER_FILTER_OPS) {
      const val = filter.value[op.key];
      if (val !== undefined) {
        setKey(op.key);
        setValue(val);
        return;
      }
    }
  }, [filter]);

  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={(newIsOpen) => {
        if (!newIsOpen) {
          if (typeof key === "string" && value !== undefined) {
            onChange({ ...filter, value: { [key]: value } });
          }
        }
        setOpen(newIsOpen);
      }}
    >
      <PopoverTrigger disabled={!isEditable}>
        <Badge variant="outline" className={cn("flex bg-card pr-2")}>
          {filter.featureName}{" "}
          <span className="ml-1 font-mono text-xs">
            {opLabel && value ? `${opLabel} ${value}` : "exists"}
          </span>
          {isEditable && (
            <button
              className="ml-1 rounded-full flex items-center"
              onClick={onDelete}
            >
              <X className="h-3 w-3 my-auto" />
            </button>
          )}
        </Badge>
      </PopoverTrigger>
      <PopoverContent align="start">
        <div>{filter.featureName}:</div>
        <div className="h-2"></div>
        <div className="flex items-center gap-2">
          <Select
            value={key}
            onValueChange={(val) => {
              setKey(val as OpKey);
            }}
          >
            <SelectTrigger className="w-36 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NUMBER_FILTER_OPS.map((op) => (
                <SelectItem
                  key={op.key}
                  value={op.key}
                  onClick={() => {
                    setKey(op.key);
                  }}
                >
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={value}
            onChange={(e) => {
              setValue(Number(e.target.value));
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

type StringFilter = Extract<
  FeatureFilter,
  { dataType: TypeName.String | TypeName.Name }
>;

const STRING_FILTER_OPS = [
  { key: "eq", label: "=" },
  { key: "contains", label: "contains" },
] as const;

type StringOpKey = (typeof STRING_FILTER_OPS)[number]["key"];

function StringFilterChip(props: {
  filter: StringFilter;
  onChange: (value: StringFilter) => void;
  onDelete?: () => void;
  isEditable?: boolean;
}) {
  const { filter, onChange, onDelete, isEditable = false } = props;

  const [key, setKey] = useState<StringOpKey | undefined>();
  const [value, setValue] = useState<string | undefined>();

  const opLabel = useMemo(() => {
    if (!key) return "--";
    return STRING_FILTER_OPS.find((op) => op.key === key)?.label ?? "--";
  }, [key]);

  useEffect(() => {
    if (!filter) return;
    for (const op of STRING_FILTER_OPS) {
      const val = filter.value[op.key];
      if (val !== undefined) {
        setKey(op.key);
        setValue(val);
        return;
      }
    }
  }, [filter]);

  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={(newIsOpen) => {
        if (!newIsOpen) {
          if (typeof key === "string" && value !== undefined) {
            onChange({ ...filter, value: { [key]: value } });
          }
        }
        setOpen(newIsOpen);
      }}
    >
      <PopoverTrigger disabled={!isEditable}>
        <Badge variant="outline" className={cn("flex bg-card")}>
          {filter.featureName}{" "}
          <span className="ml-1 text-xs">
            {opLabel && value ? `${opLabel} ${value}` : "exists"}
          </span>
          {isEditable && (
            <button
              className="ml-1 rounded-full flex items-center"
              onClick={onDelete}
            >
              <X className="h-3 w-3 my-auto" />
            </button>
          )}
        </Badge>
      </PopoverTrigger>
      <PopoverContent align="start">
        <div>{filter.featureName}:</div>
        <div className="h-2"></div>
        <div className="flex items-center gap-2">
          <Select
            value={key}
            onValueChange={(val) => {
              setKey(val as StringOpKey);
            }}
          >
            <SelectTrigger className="w-36 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STRING_FILTER_OPS.map((op) => (
                <SelectItem
                  key={op.key}
                  value={op.key}
                  onClick={() => {
                    setKey(op.key);
                  }}
                >
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

type BooleanFilter = Extract<FeatureFilter, { dataType: TypeName.Boolean }>;

const BOOLEAN_FILTER_OPS = [{ key: "eq", label: "=" }] as const;

type BooleanOpKey = (typeof BOOLEAN_FILTER_OPS)[number]["key"];

function BooleanFilterChip(props: {
  filter: BooleanFilter;
  onChange: (value: BooleanFilter) => void;
  onDelete?: () => void;
  isEditable?: boolean;
}) {
  const { filter, onChange, onDelete, isEditable = false } = props;

  const [key, setKey] = useState<BooleanOpKey | undefined>();
  const [value, setValue] = useState<"true" | "false" | undefined>();

  const opLabel = useMemo(() => {
    if (!key) return "--";
    return BOOLEAN_FILTER_OPS.find((op) => op.key === key)?.label ?? "--";
  }, [key]);

  useEffect(() => {
    if (!filter) return;
    for (const op of BOOLEAN_FILTER_OPS) {
      const val = filter.value[op.key];
      if (val !== undefined) {
        setKey(op.key);
        setValue(val ? "true" : "false");
        return;
      }
    }
  }, [filter]);

  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={(newIsOpen) => {
        if (!newIsOpen) {
          if (typeof key === "string" && value !== undefined) {
            onChange({
              ...filter,
              value: { [key]: value === "true" ? true : false },
            });
          }
        }
        setOpen(newIsOpen);
      }}
    >
      <PopoverTrigger disabled={!isEditable}>
        <Badge variant="outline" className={cn("flex bg-card")}>
          {filter.featureName}{" "}
          <span className="ml-1 font-mono text-xs">
            {opLabel && value ? `${opLabel} ${value}` : "exists"}
          </span>
          {isEditable && (
            <button
              className="ml-1 rounded-full flex items-center"
              onClick={onDelete}
            >
              <X className="h-3 w-3 my-auto" />
            </button>
          )}
        </Badge>
      </PopoverTrigger>
      <PopoverContent align="start">
        <div>{filter.featureName}:</div>
        <div className="h-2"></div>
        <div className="flex items-center gap-2">
          <Select
            value={key}
            onValueChange={(val) => {
              setKey(val as BooleanOpKey);
            }}
          >
            <SelectTrigger className="w-36 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BOOLEAN_FILTER_OPS.map((op) => (
                <SelectItem
                  key={op.key}
                  value={op.key}
                  onClick={() => {
                    setKey(op.key);
                  }}
                >
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={value}
            onValueChange={(val) => {
              setValue(val as "true" | "false");
            }}
          >
            <SelectTrigger className="w-36 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">true</SelectItem>
              <SelectItem value="false">false</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type EntityFilter = Extract<FeatureFilter, { dataType: TypeName.Entity }>;

export { DateRangeChip, LabelChip, TypeChip };

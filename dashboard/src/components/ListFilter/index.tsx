// universal filter component - works for both entities and events

import { Command as CommandPrimitive } from "cmdk";

import {
  Check,
  Hash,
  ListFilter,
  LucideIcon,
  Search,
  Sparkles,
  ToggleLeft,
  Type,
  X,
} from "lucide-react";
import {
  ComponentPropsWithoutRef,
  ElementRef,
  forwardRef,
  useRef,
  useState,
} from "react";
import { Button } from "../ui/button";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Badge } from "../ui/badge";
import { Calendar } from "../ui/calendar";
import type { DateRange } from "react-day-picker";
import { cn } from "~/lib/utils";
import { opsByDataType } from "./types";

const dataTypeToIcon = {
  number: Hash,
  boolean: ToggleLeft,
  text: Type,
} as Record<string, LucideIcon>;

interface Props {
  options: {
    types: string[];
    labels: string[];
    features: { feature: string; dataType: string }[];
  };
  onChange: (filter: FilterOutput) => void;
}
interface FilterOutput {
  types: string[];
  // sortBy: {
  //   feature: string;
  //   direction: string;
  //   dataType: string;
  // } | null;
  labels: string[];
  features: { feature: string; dataType: string }[];
}

function Filter(props: Props) {
  const { options, onChange } = props;

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [filters, setFilters] = useState<[string, string, string][]>([]);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  return (
    <>
      <div className="flex gap-1.5 items-center pr-3 border-r">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="p-1 px-2 my-auto h-6 flex items-center hover:bg-muted hover:text-muted-foreground"
            >
              <ListFilter className="h-4 w-4 mr-1.5" />
              <span className="text-xs">Filter</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {/* Type Filter */}
            {/* <DropdownMenuSub>
              <DropdownMenuSubTrigger>Type</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {options.types.map((type) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => {
                      setSelectedTypes(type);
                    }}
                  >
                    <Badge
                      variant="outline"
                      className="flex pr-2 animate-in zoom-in-95 fade-in-20 bg-white shadow-sm"
                    >
                      Type: {type}
                      <X className="ml-1 h-3 w-3 my-auto" />
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub> */}

            {/* Types Filter */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Types</DropdownMenuSubTrigger>

              <DropdownMenuSubContent>
                <Command>
                  <CommandInput placeholder="Search Types..." autoFocus />
                  <CommandList>
                    <CommandEmpty>No types found.</CommandEmpty>
                    <CommandGroup>
                      {options.types.map((type) => (
                        <CommandItem
                          key={type}
                          onSelect={() => {
                            if (!selectedTypes.includes(type)) {
                              setSelectedTypes([...selectedTypes, type]);
                            } else {
                              setSelectedTypes(
                                selectedTypes.filter((l) => l !== type)
                              );
                            }
                          }}
                          className="pl-8 relative"
                        >
                          {selectedTypes.includes(type) && (
                            <Check className="absolute w-4 h-4 left-2 top-2" />
                          )}

                          <Badge
                            className="bg-card shadow-sm pr-2"
                            variant="outline"
                          >
                            {type}
                            <X className="ml-1 h-3 w-3 my-auto" />
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Labels Filter */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Labels</DropdownMenuSubTrigger>

              <DropdownMenuSubContent>
                <Command>
                  <CommandInput placeholder="Search Labels..." autoFocus />
                  <CommandList>
                    <CommandEmpty>No labels found.</CommandEmpty>
                    <CommandGroup>
                      {options.labels.map((label) => (
                        <CommandItem
                          key={label}
                          onSelect={() => {
                            if (!selectedLabels.includes(label)) {
                              setSelectedLabels([...selectedLabels, label]);
                            } else {
                              setSelectedLabels(
                                selectedLabels.filter((l) => l !== label)
                              );
                            }
                          }}
                          className="pl-8 relative"
                        >
                          {selectedLabels.includes(label) && (
                            <Check className="absolute w-4 h-4 left-2 top-2" />
                          )}

                          <Badge className="border border-blue-200 shadow-sm pr-2">
                            {label}
                            <X className="ml-1 h-3 w-3 my-auto" />
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Features Filter */}
            <DropdownMenuSub>
              <FilterSelect
                options={options}
                onSet={(entry) => {
                  setFilters([...filters, entry]);
                }}
              />
            </DropdownMenuSub>

            {/* Date Range */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Date Range</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <Calendar
                  initialFocus
                  mode="range"
                  // defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  // numberOfMonths={2}
                />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mr-auto ml-3 flex gap-1 flex-wrap">
        {/* {selectedType && (
          <Badge
            variant="outline"
            className="flex pr-2 animate-in zoom-in-95 fade-in-20"
          >
            Type: {selectedType}
            <button
              className="rounded-full flex items-center"
              onClick={() => {
                setSelectedType(null);
              }}
            >
              <X className="ml-1 h-3 w-3 my-auto" />
            </button>
          </Badge>
        )} */}
        {selectedTypes.map((type) => (
          <Badge
            variant="outline"
            className="flex pr-2 animate-in zoom-in-95 fade-in-20"
          >
            {type}
            <button
              className="rounded-full flex items-center"
              onClick={() => {
                setSelectedTypes(selectedTypes.filter((l) => l !== type));
              }}
            >
              <X className="ml-1 h-3 w-3 my-auto" />
            </button>
          </Badge>
        ))}
        {selectedLabels.map((label) => (
          <Badge
            variant="default"
            className="flex pr-2 animate-in zoom-in-95 fade-in-20"
          >
            {label}
            <button
              className="rounded-full flex items-center"
              onClick={() => {
                setSelectedLabels(selectedLabels.filter((l) => l !== label));
              }}
            >
              <X className="ml-1 h-3 w-3 my-auto" />
            </button>
          </Badge>
        ))}
        {filters.map((entry) => (
          <Badge
            variant="default"
            className="flex pr-2 animate-in zoom-in-95 fade-in-20"
          >
            {entry.join(" ")}
            <button
              className="rounded-full flex items-center"
              onClick={() => {
                setFilters(filters.filter((f) => f !== entry));
              }}
            >
              <X className="ml-1 h-3 w-3 my-auto" />
            </button>
          </Badge>
        ))}
      </div>
    </>
  );
}

interface FilterSelectProps {
  options: {
    features: { feature: string; dataType: string }[];
  };
  onSet: (option: [string, string, string]) => void;
}

function FilterSelect({ options, onSet }: FilterSelectProps) {
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<"feature" | "comp" | "vals">("feature");
  const [selectedFeature, setSelectedFeature] = useState<{
    feature: string;
    dataType: string;
  } | null>(null);
  const [selectedOp, setSelectedOp] = useState<string | null>(null);

  const placeholderText = stage === "feature" ? "Search Features..." : "";

  const dataType = selectedFeature?.dataType ?? "";
  const opObj = opsByDataType[dataType] ?? {};
  const opVal = opObj[selectedOp ?? ""];

  const formatVal = (val: string) => {
    const dataType = selectedFeature?.dataType ?? "";
    const opObj = opsByDataType[dataType];
    if (!opObj) return "error 1";
    const opVal = opObj[selectedOp ?? ""];
    if (!opVal) return "error 2";

    if (opVal === "text") {
      return `'${inputVal}'`;
    }
    if (opVal === "number") {
      return inputVal;
    }
    if (opVal === "none") {
      return "";
    }
    return "--";
  };

  const submit = () => {
    onSet([selectedFeature?.feature ?? "", selectedOp ?? "", inputVal]);
    setInputVal("");
    setStage("feature");
    setSelectedFeature(null);
    setSelectedOp(null);
  };

  return (
    <>
      <DropdownMenuSubTrigger>Features</DropdownMenuSubTrigger>

      <DropdownMenuSubContent className="w-[28rem]">
        <Command>
          <CustomCommandInput
            placeholder={placeholderText}
            value={inputVal}
            onValueChange={(val) => {
              setInputVal(val);
            }}
            ref={inputRef}
            onKeyDown={(e) => {
              if (inputVal === "" && e.key === "Backspace") {
                if (stage === "comp") {
                  setSelectedFeature(null);
                  setStage("feature");
                  setInputVal("");
                } else if (stage === "vals") {
                  setSelectedOp(null);
                  setStage("comp");
                  setInputVal("");
                }
              }
              if (e.key === "ArrowLeft") {
                // breaks arrow key navigation, but allows for text selection
                e.stopPropagation();
              }
              if (e.key === "Enter" && stage === "vals") {
                submit();
              }
            }}
          >
            {selectedFeature && (
              <Badge className="border border-blue-200 shadow-sm pr-1.5 rounded-r-none shrink-0 animate-in zoom-in-95 fade-in-20">
                {selectedFeature.feature}
              </Badge>
            )}
            {selectedOp && (
              <Badge
                className={cn(
                  "border border-blue-200 shadow-sm pl-1.5 border-l-transparent rounded-l-none shrink-0 animate-in zoom-in-95 fade-in-20",
                  {
                    "rounded-r-none pr-1.5": opVal !== "none",
                  }
                )}
              >
                {selectedOp}
              </Badge>
            )}
            <div className="w-2" />
          </CustomCommandInput>

          {stage === "feature" && (
            <CommandList>
              <CommandEmpty>No results.</CommandEmpty>
              <CommandGroup>
                {options.features.map((feature) => {
                  const DataTypeIcon = dataTypeToIcon[feature.dataType] ?? Type;

                  return (
                    <CommandItem
                      key={feature.feature}
                      onSelect={() => {
                        setSelectedFeature(feature);
                        setStage("comp");
                        setInputVal("");
                        inputRef.current?.focus();
                      }}
                      className="pl-8 relative"
                    >
                      <DataTypeIcon className="w-4 h-4 absolute left-2 top-2" />
                      {feature.feature}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          )}
          {stage === "comp" && (
            <CommandList>
              <CommandEmpty>No results.</CommandEmpty>
              <CommandGroup>
                {Object.keys(
                  opsByDataType[selectedFeature?.dataType ?? "none"] ?? {}
                ).map((op) => {
                  return (
                    <CommandItem
                      key={op}
                      onSelect={() => {
                        setSelectedOp(op);
                        setStage("vals");
                        setInputVal("");
                        inputRef.current?.focus();
                      }}
                      className="pl-8 relative"
                    >
                      <Sparkles className="w-4 h-4 absolute left-2 top-2" />
                      {op}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          )}
          {stage === "vals" && (
            <div className="p-2">
              {opVal === "date" && (
                <Calendar
                  mode="single"
                  numberOfMonths={1}
                  selected={new Date()}
                />
              )}

              <div className="h-10 flex justify-center items-center">
                <Badge className="border-blue-200 shadow-sm">
                  {selectedFeature?.feature} {selectedOp} {formatVal(inputVal)}
                  <X className="ml-1 h-3 w-3 my-auto" />
                </Badge>
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  variant="ghost"
                  className="ml-auto px-3 h-6"
                  onClick={submit}
                >
                  Submit
                </Button>
              </div>
            </div>
          )}
        </Command>
      </DropdownMenuSubContent>
    </>
  );
}

const CustomCommandInput = forwardRef<
  ElementRef<typeof CommandPrimitive.Input>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, children, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    {children}
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
));

export default Filter;

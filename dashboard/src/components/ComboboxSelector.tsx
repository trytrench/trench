import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { api } from "../utils/api";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import clsx from "clsx";

interface ComboboxSelectorProps {
  value: string | null;
  onSelect: (nodeId: string | null) => void;
  renderTrigger?: (props: {
    value: string | null;
    originalChildren: React.ReactNode;
    renderOriginal: (children: React.ReactNode) => React.ReactNode;
  }) => React.ReactNode;
  placeholder?: string;
  options: {
    label: string;
    value: string;
  }[];
  disabled?: boolean;
  renderOption?: (props: {
    option: {
      label: string;
      value: string;
    };
    selected: boolean;
  }) => React.ReactNode;
}

export function ComboboxSelector(props: ComboboxSelectorProps) {
  const {
    value,
    onSelect,
    placeholder,
    options,
    renderTrigger,
    renderOption,
    disabled = false,
  } = props;

  // Set max height of popover without using max-h to fix scrolling issue
  // https://github.com/shadcn-ui/ui/issues/542
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) setHeight(ref.current.clientHeight);
  }, [options]);

  const [open, setOpen] = useState(false);

  const renderOriginal = (children: React.ReactNode) => (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className="w-[200px] justify-between"
    >
      {children}
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  const originalValue = value
    ? options.find((option) => option.value === value)?.label
    : placeholder ?? "Select...";
  return (
    <Popover
      open={open}
      onOpenChange={(open) => {
        // For some reason this is needed because the disabled prop doesn't work
        if (disabled) return;
        setOpen(open);
      }}
      modal
    >
      <PopoverTrigger asChild disabled={disabled}>
        {renderTrigger
          ? renderTrigger({
              value,
              renderOriginal,
              originalChildren: originalValue,
            })
          : renderOriginal(originalValue)}
      </PopoverTrigger>
      <PopoverContent className="p-0 w-auto" align="start">
        <Command>
          <CommandInput placeholder="Search nodes..." />
          <ScrollArea
            ref={ref}
            className={clsx({ "h-[300px]": height >= 300 })}
          >
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  value={option.value}
                  key={option.value}
                  onSelect={() => {
                    setOpen(false);
                    if (option.value === value) {
                      onSelect(null);
                    } else {
                      onSelect(option.value);
                    }
                  }}
                >
                  {renderOption ? (
                    renderOption({ option, selected: option.value === value })
                  ) : (
                    <>
                      <Check
                        className={cn("mr-2 h-4 w-4", {
                          "opacity-100": option.value === value,
                          "opacity-0": option.value !== value,
                        })}
                      />
                      {option.label}
                    </>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

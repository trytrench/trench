import { FeatureDef, NodeDef, NodeDefsMap, NodeType } from "event-processing";
import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";
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

interface ComboboxSelectorProps {
  value: string | null;
  onSelect: (nodeId: string | null) => void;
  renderTrigger?: (props: { value: string | null }) => React.ReactNode;
  placeholder?: string;
  options: {
    label: string;
    value: string;
  }[];
  renderOption?: (props: {
    option: {
      label: string;
      value: string;
    };
    selected: boolean;
  }) => React.ReactNode;
}

export function ComboboxSelector(props: ComboboxSelectorProps) {
  const { value, onSelect, placeholder, options, renderTrigger, renderOption } =
    props;

  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {renderTrigger ? (
          renderTrigger({ value })
        ) : (
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between"
          >
            {value
              ? options.find((option) => option.value === value)?.label
              : placeholder ?? "Select..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Command>
          <CommandInput placeholder="Search nodes..." />
          <CommandEmpty>No nodes found.</CommandEmpty>
          <CommandGroup>
            {options.map((option) => (
              <CommandItem
                value={option.label}
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
        </Command>
      </PopoverContent>
    </Popover>
  );
}

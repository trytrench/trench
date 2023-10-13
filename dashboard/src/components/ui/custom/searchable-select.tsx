import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "../popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../command";
import { ScrollArea } from "../scroll-area";
import { Button } from "../button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "~/lib/utils";

interface Props {
  options: { value: string; label: string; icon?: any }[];
  emptyMessage?: string;
  className?: string;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function SearchableSelect(props: Props) {
  const { options, emptyMessage, className, placeholder } = props;
  const { value, onValueChange } = props;

  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[200px] justify-between", className)}
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" side="bottom">
        <Command className="">
          <CommandInput placeholder="Search..." />
          <ScrollArea className="h-64">
            <CommandEmpty>{emptyMessage ?? "No results found."}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={(val) => {
                    onValueChange?.(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

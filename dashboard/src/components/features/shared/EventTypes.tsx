import { Check } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

interface EventTypesProps {
  eventTypes?: Set<string>;
  onChange?: (eventTypes: Set<string>) => void;
}

function EventTypes(props: EventTypesProps) {
  const { eventTypes, onChange } = props;

  // todo: query event types

  const toggleEventType = (eventType: string) => {
    const newSet = new Set(eventTypes);
    if (newSet.has(eventType)) {
      newSet.delete(eventType);
    } else {
      newSet.add(eventType);
    }

    onChange?.(newSet);
  };

  // placeholder
  const eventTypeOpts = ["event-a", "payment-attempt", "test-event"];

  return (
    <div>
      <div className="text-muted-foreground pl-2">
        {!eventTypes || eventTypes.size === 0 ? (
          <span>None</span>
        ) : (
          <span className="font-mono">{[...eventTypes].sort().join(", ")}</span>
        )}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="xs" className="mr-auto mt-2">
            Add/Remove
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="p-0">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {eventTypeOpts.map((eventType) => (
                  <CommandItem
                    key={eventType}
                    value={eventType}
                    onSelect={() => {
                      toggleEventType(eventType);
                    }}
                    className="relative pl-8"
                  >
                    {eventTypes?.has(eventType) && (
                      <Check className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4" />
                    )}
                    {eventType}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { EventTypes };

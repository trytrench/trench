import { Check, Pencil } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { api } from "~/utils/api";

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
  const { data: eventTypeOpts } = api.eventTypes.list.useQuery();

  return (
    <div>
      <div className="flex items-center gap-8 mb-3">
        <Label className="text-emphasis-foreground text-md">Event Types</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              size="xs"
              className="mr-auto gap-2"
              disabled={!eventTypeOpts?.length}
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="p-0">
            <Command>
              <CommandInput placeholder="Search..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {eventTypeOpts?.map((eventType) => (
                    <CommandItem
                      key={eventType.id}
                      value={eventType.type}
                      onSelect={() => {
                        toggleEventType(eventType.id);
                      }}
                      className="relative pl-8"
                    >
                      {eventTypes?.has(eventType.id) && (
                        <Check className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4" />
                      )}
                      {eventType.type}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <div className="text-muted-foreground">
        {!eventTypes || eventTypes.size === 0 ? (
          <span className="text-sm italic">No Event Types</span>
        ) : (
          <span className="font-mono">
            {[...eventTypes]
              .sort()
              .map((id) => eventTypeOpts?.find((v) => v.id === id)?.type)
              .join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}

export { EventTypes };

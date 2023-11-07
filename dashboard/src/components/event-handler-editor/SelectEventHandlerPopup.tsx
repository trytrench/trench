import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { SelectEventHandler } from "./SelectEventHandler";
import { type EventHandler } from "./types";
import { EventHandlerLabel } from "./EventHandlerLabel";

export function SelectEventHandlerPopup(props: {
  value: EventHandler | undefined;
  onSelect: (handler: EventHandler) => void;
  renderTrigger?: (props: {
    selectedEventHandler: EventHandler | undefined;
  }) => React.ReactNode;
}) {
  const { value, onSelect, renderTrigger } = props;

  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {renderTrigger ? (
          renderTrigger({
            selectedEventHandler: value,
          })
        ) : (
          <button className="max-w-[20rem] inline-flex items-center text-sm bg-muted rounded-sm px-3 py-1 hover:brightness-150 data-[state=open]:brightness-150 transition">
            {value ? (
              <EventHandlerLabel eventHandler={value} />
            ) : (
              <span className="text-muted-foreground">Select code</span>
            )}
            <ChevronDown className="inline ml-1.5 -mr-1.5 h-4 w-4" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pt-2" align="start">
        <SelectEventHandler
          value={value}
          onSelect={(handler) => {
            onSelect?.(handler);
            setOpen(false);
          }}
        />
        <div className="h-4 shrink-0"></div>
      </PopoverContent>
    </Popover>
  );
}

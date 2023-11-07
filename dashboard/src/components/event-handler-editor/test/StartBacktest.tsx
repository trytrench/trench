import { useState } from "react";
import { Calendar, ChevronDown, Play } from "lucide-react";
import { Panel } from "../../ui/custom/panel";
import { add, endOfDay } from "date-fns";
import { type DateRange } from "react-day-picker";
import { EmbeddedDatePicker, formatSelectedDates } from "./EmbeddedDatePicker";
import { RenderCodeHash } from "../RenderCodeHash";
import { api } from "../../../utils/api";
import { toast } from "../../ui/use-toast";
import { handleError } from "../../../lib/handleError";
import { useProject } from "../../../hooks/useProject";
import { SpinnerButton } from "../../ui/custom/spinner-button";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "../../ui/popover";
import { Separator } from "@radix-ui/react-select";
import { SelectEventHandler } from "../SelectEventHandler";
import { EventHandler } from "../types";
import { EventHandlerLabel } from "../EventHandlerLabel";

function SelectEventHandlerPopup(props: {
  value: EventHandler | undefined;
  onSelect: (handler: EventHandler) => void;
}) {
  const { value, onSelect } = props;

  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center text-sm bg-muted rounded-sm px-3 py-1 hover:bg-muted/80">
          {value ? (
            <span>
              <EventHandlerLabel eventHandler={value} />
            </span>
          ) : (
            <span className="text-muted-foreground">Select code</span>
          )}
          <ChevronDown className="inline ml-1.5 -mr-1.5 h-4 w-4" />
        </button>
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

interface StartBacktestProps {
  onStart?: () => void;
}

export function StartBacktest(props: StartBacktestProps) {
  const { onStart } = props;

  const { data: project } = useProject();

  const [selectedEventHandler, setSelectedEventHandler] = useState<
    EventHandler | undefined
  >();

  const [backtestDateRange, setBacktestDateRange] = useState<
    DateRange | undefined
  >({
    from: add(new Date(), { days: -7 }),
    to: new Date(),
  });

  const { mutateAsync: createBacktest, isLoading: loadingCreateBacktest } =
    api.backtests.create.useMutation();

  return (
    <div className="flex">
      <Panel className="p-4 w-full">
        <h1 className="text-lg text-foreground flex items-center gap-2">
          Test
        </h1>
        <div className="h-4"></div>

        <div>
          <span>
            Test{" "}
            <SelectEventHandlerPopup
              value={selectedEventHandler}
              onSelect={setSelectedEventHandler}
            />{" "}
            on events from{" "}
            <EmbeddedDatePicker
              dateRange={backtestDateRange}
              onDateRangeChange={setBacktestDateRange}
            />
          </span>
        </div>

        <div className="h-6"></div>

        <div className="flex items-center gap-2">
          <SpinnerButton
            loading={loadingCreateBacktest}
            disabled={!selectedEventHandler}
            className="shrink-0"
            onClick={() => {
              if (!project) {
                toast({ title: "Please select a project" });
                return;
              }
              if (!backtestDateRange?.from || !backtestDateRange?.to) {
                toast({ title: "Please select a date range" });
                return;
              }
              if (!selectedEventHandler) {
                toast({ title: "Please select an event handler" });
                return;
              }
              createBacktest({
                from: backtestDateRange.from,
                to: endOfDay(backtestDateRange.to),
                eventHandlerId: selectedEventHandler.id,
                projectId: project.id,
              })
                .then(() => {
                  onStart?.();
                })
                .catch(handleError);
            }}
          >
            <Play className="h-3 w-3 mr-1" />
            Start backtest
          </SpinnerButton>
        </div>
      </Panel>
      <div className="h-4"></div>
    </div>
  );
}

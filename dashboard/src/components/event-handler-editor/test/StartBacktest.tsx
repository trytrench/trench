import { useState } from "react";
import { useAtom } from "jotai";
import { compileStatusAtom } from "../../../global-state/editor";
import { Button } from "../../ui/button";
import { Play } from "lucide-react";
import { Panel } from "../../ui/custom/panel";
import { add } from "date-fns";
import { type DateRange } from "react-day-picker";
import { EmbeddedDatePicker } from "../EmbeddedDatePicker";
import { RenderCodeHash } from "../RenderCodeHash";
import { api } from "../../../utils/api";
import { toast } from "../../ui/use-toast";
import { handleError } from "../../../lib/handleError";
import { Input } from "../../ui/input";
import { useProject } from "../../../hooks/useProject";
import { SpinnerButton } from "../../ui/custom/spinner-button";

interface StartBacktestProps {
  onStart?: () => void;
  eventHandlerId: string;
}

export function StartBacktest(props: StartBacktestProps) {
  const { onStart, eventHandlerId } = props;

  const { data: project } = useProject();

  const { data: eventHandler } = api.eventHandlers.get.useQuery({
    id: eventHandlerId,
  });

  const [backtestDateRange, setBacktestDateRange] = useState<
    DateRange | undefined
  >({
    from: add(new Date(), { days: -7 }),
    to: new Date(),
  });

  const { mutateAsync: createBacktest, isLoading: loadingCreateBacktest } =
    api.backtests.create.useMutation();

  if (!eventHandler) {
    return null;
  }
  return (
    <Panel className="p-4">
      <div className="text-lg text-foreground flex items-center gap-2">
        Test
      </div>
      <div className="h-4"></div>

      <div>
        <span>
          Test <RenderCodeHash hashHex={eventHandler.hash} /> on events from{" "}
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
            createBacktest({
              from: backtestDateRange.from,
              to: backtestDateRange.to,
              eventHandlerId: compileStatus.eventHandlerId!,
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
  );
}

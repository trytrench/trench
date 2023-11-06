import { useState } from "react";
import { useAtom } from "jotai";
import { compileStatusAtom } from "../../global-state/editor";
import { Button } from "../ui/button";
import { Play } from "lucide-react";
import { Panel } from "../ui/custom/panel";
import { add } from "date-fns";
import { type DateRange } from "react-day-picker";
import { EmbeddedDatePicker } from "./EmbeddedDatePicker";
import { RenderCodeHash } from "./RenderCodeHash";
import { api } from "../../utils/api";
import { toast } from "../ui/use-toast";
import { handleError } from "../../lib/handleError";
import { Input } from "../ui/input";
import { useProject } from "../../hooks/useProject";
import { SpinnerButton } from "../ui/custom/spinner-button";

export function StartBacktest(props: { onStart?: () => void }) {
  const { onStart } = props;

  const { data: project } = useProject();

  const [backtestDateRange, setBacktestDateRange] = useState<
    DateRange | undefined
  >({
    from: add(new Date(), { days: -7 }),
    to: new Date(),
  });
  const [compileStatus] = useAtom(compileStatusAtom);

  const [message, setMessage] = useState<string>("");

  const { mutateAsync: createBacktest, isLoading: loadingCreateBacktest } =
    api.backtests.create.useMutation();

  if (compileStatus.status !== "success") {
    return null;
  }

  return (
    <Panel className="p-4 m-4">
      <div className="text-lg font-bold text-foreground flex items-center gap-2">
        Test
      </div>
      <div className="h-4"></div>

      <div>
        <span>
          Test <RenderCodeHash hashHex={compileStatus.codeHash} /> on events
          from{" "}
          <EmbeddedDatePicker
            dateRange={backtestDateRange}
            onDateRangeChange={setBacktestDateRange}
          />
        </span>
      </div>

      <div className="h-6"></div>

      <div className="flex items-center gap-2">
        <Input
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
          }}
          placeholder="Message..."
        />
        <SpinnerButton
          loading={loadingCreateBacktest}
          disabled={!message}
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
            if (!message) {
              toast({ title: "Please enter a message" });
              return;
            }
            createBacktest({
              from: backtestDateRange.from,
              to: backtestDateRange.to,
              eventHandler: {
                code: compileStatus.code,
                description: message,
              },
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

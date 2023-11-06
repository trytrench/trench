import { Fragment, useState } from "react";
import { useAtom } from "jotai";
import { compileStatusAtom } from "../../../global-state/editor";
import { Separator } from "../../ui/separator";
import { api } from "../../../utils/api";
import { useProject } from "../../../hooks/useProject";
import { Panel } from "../../ui/custom/panel";
import { StartBacktest } from "./StartBacktest";
import { handleError } from "../../../lib/handleError";
import { SelectEventHandler } from "./SelectEventHandler";

export function Backtest() {
  const { data: project } = useProject();
  const { data: backtests, refetch } = api.datasets.listBacktests.useQuery(
    { projectId: project!.id },
    { enabled: !!project }
  );

  const [selectedEventHandlerId, setSelectedEventHandlerId] = useState<
    string | undefined
  >();

  const [compileStatus] = useAtom(compileStatusAtom);

  if (compileStatus.status !== "success") {
    return null;
  }
  return (
    <div className="flex w-full">
      <div className="flex-1">
        <SelectEventHandler
          eventHandlerId={selectedEventHandlerId}
          onChange={setSelectedEventHandlerId}
        />
      </div>
      <Separator orientation="vertical" />
      <div className="flex-[2] p-4">
        {selectedEventHandlerId ? (
          <StartBacktest eventHandlerId={selectedEventHandlerId} />
        ) : null}
      </div>
    </div>
  );
}

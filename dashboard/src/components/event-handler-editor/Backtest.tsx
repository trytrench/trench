import { Fragment } from "react";
import { useAtom } from "jotai";
import { compileStatusAtom } from "../../global-state/editor";
import { Separator } from "../ui/separator";
import { api } from "../../utils/api";
import { useProject } from "../../hooks/useProject";
import { Panel } from "../ui/custom/panel";
import { StartBacktest } from "./StartBacktest";
import { handleError } from "../../lib/handleError";
import { RenderBacktest } from "./RenderBacktest";

export function Backtest() {
  const { data: project } = useProject();
  const { data: backtests, refetch } = api.datasets.listBacktests.useQuery(
    { projectId: project!.id },
    { enabled: !!project }
  );

  const [compileStatus] = useAtom(compileStatusAtom);

  if (compileStatus.status !== "success") {
    return null;
  }
  return (
    <div className="flex-1">
      <StartBacktest
        onStart={() => {
          refetch().catch(handleError);
        }}
      />
      <Panel className="p-4 m-4">
        <div className="text-lg text-foreground">History</div>
        <div className="h-2"></div>
        {!backtests ? (
          <div>Loading...</div>
        ) : backtests.length === 0 ? (
          <div className="text-muted-foreground">No backtests yet</div>
        ) : (
          <div>
            {backtests.map((backtest, idx) => {
              return (
                <Fragment key={backtest.id}>
                  {idx !== 0 && <Separator className="my-2" />}
                  <RenderBacktest backtestId={backtest.id} />
                </Fragment>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

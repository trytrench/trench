import { Fragment, useState } from "react";
import { useAtom } from "jotai";
import { compileStatusAtom } from "../../../global-state/editor";
import { Separator } from "../../ui/separator";
import { api } from "../../../utils/api";
import { useProject } from "../../../hooks/useProject";
import { Panel } from "../../ui/custom/panel";
import { StartBacktest } from "./StartBacktest";
import { handleError } from "../../../lib/handleError";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { BacktestStatusTable } from "./BacktestStatusTable";

export function Backtest() {
  const { data: project } = useProject();

  const { data: backtests, refetch } = api.backtests.listIds.useQuery(
    { projectId: project!.id },
    { enabled: !!project }
  );

  const [compileStatus] = useAtom(compileStatusAtom);

  if (compileStatus.status !== "success") {
    return null;
  }
  return (
    <div className="p-4 flex flex-col gap-4 w-full">
      <StartBacktest
        onStart={() => {
          refetch().catch(handleError);
        }}
      />
      <Panel className="p-0 w-full">
        <h1 className="text-lg p-4">Backtests</h1>

        <BacktestStatusTable backtestDatasetIds={backtests ?? []} />
      </Panel>
    </div>
  );
}

import { formatRelative } from "date-fns";
import { api } from "../../../utils/api";
import { cn } from "../../../lib/utils";
import { Progress } from "../../ui/progress";
import { BacktestStatusIndicator } from "./BacktestStatusIndicator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { EventHandlerLabel } from "../EventHandlerLabel";
import { Button } from "../../ui/button";
import { formatSelectedDates } from "./EmbeddedDatePicker";
import { useEffect, useState } from "react";

function BacktestStatusRow(props: { backtestDatasetId: bigint }) {
  const { backtestDatasetId } = props;

  const { data: backtestDataset } = api.backtests.get.useQuery(
    {
      id: backtestDatasetId,
    },
    {
      refetchInterval: (data) => {
        return data?.isActive ? 1000 : false;
      },
    }
  );

  if (!backtestDataset?.eventHandler) {
    return null;
  }

  const progress =
    backtestDataset.totalEvents === 0
      ? 0
      : (backtestDataset.processedEvents / backtestDataset.totalEvents) * 100;
  return (
    <TableRow>
      <TableCell className="font-medium">
        {formatRelative(new Date(backtestDataset.createdAt), new Date())}
      </TableCell>

      <TableCell className="font-medium">
        <EventHandlerLabel eventHandler={backtestDataset.eventHandler} />
      </TableCell>
      <TableCell>
        <span>
          {formatSelectedDates(
            backtestDataset.startTime ?? undefined,
            backtestDataset.endTime ?? undefined
          )}
        </span>
      </TableCell>
      <TableCell>
        <BacktestStatusIndicator isActive={backtestDataset.isActive} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Progress value={progress} className="h-3 w-40" />
          <span className="whitespace-nowrap text-muted-foreground">
            {backtestDataset.processedEvents} / {backtestDataset.totalEvents}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Button>Inspect</Button>
      </TableCell>
    </TableRow>
  );
}

export function BacktestStatusTable(props: { backtestDatasetIds: bigint[] }) {
  const { backtestDatasetIds } = props;

  return (
    <Table>
      {/* <TableCaption>All of your backtests.</TableCaption> */}
      <TableHeader>
        <TableRow>
          <TableHead className="">Started</TableHead>
          <TableHead className="">Code</TableHead>
          <TableHead className="">Backtest window</TableHead>
          <TableHead className="w-[8rem]">Status</TableHead>
          <TableHead className="w-[16rem]">Events processed</TableHead>
          <TableHead className="text-right"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {backtestDatasetIds.map((id) => (
          <BacktestStatusRow backtestDatasetId={id} key={id} />
        ))}
      </TableBody>
    </Table>
  );
}

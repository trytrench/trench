import { formatRelative } from "date-fns";
import { RouterOutputs, api } from "../../../utils/api";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import { InfoIcon, Save } from "lucide-react";
import EventsList from "../../EventsList";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";

type BacktestDataset = RouterOutputs["backtests"]["get"];

function BacktestResultsDialog(props: { backtest: BacktestDataset }) {
  const { backtest } = props;

  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Results</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-8rem)] h-[calc(100%-4rem)] px-0 flex flex-col justify-stretch">
        <DialogHeader className="px-6">
          <DialogTitle>Backtest</DialogTitle>
          <DialogDescription>Backtest results</DialogDescription>
        </DialogHeader>
        {isOpen && <EventsList datasetId={backtest.datasetId} />}
        <DialogFooter className=""></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BacktestStatusRow(props: { backtestDatasetId: bigint }) {
  const { backtestDatasetId } = props;

  const { data: backtestDataset } = api.backtests.get.useQuery(
    { id: backtestDatasetId },
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
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger>
              {formatRelative(new Date(backtestDataset.createdAt), new Date())}
            </TooltipTrigger>
            <TooltipContent>
              {new Date(backtestDataset.createdAt).toLocaleString()}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      <TableCell className="font-medium max-w-[20rem]">
        <EventHandlerLabel eventHandler={backtestDataset.eventHandler} />
      </TableCell>
      <TableCell>
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger>
              <span>
                {formatSelectedDates(
                  backtestDataset.startTime ?? undefined,
                  backtestDataset.endTime ?? undefined
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {backtestDataset.startTime &&
                backtestDataset.endTime &&
                `${new Date(
                  backtestDataset.startTime
                ).toLocaleString()} - ${new Date(
                  backtestDataset.endTime
                ).toLocaleString()}`}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
        <BacktestResultsDialog backtest={backtestDataset} />
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

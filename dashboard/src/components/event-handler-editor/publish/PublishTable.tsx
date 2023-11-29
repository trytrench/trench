import { formatRelative } from "date-fns";
import { api } from "../../../utils/api";
import { cn } from "../../../lib/utils";
import { Progress } from "../../ui/progress";
import { BacktestStatusIndicator } from "../test/BacktestStatusIndicator";
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
import { formatSelectedDates } from "../test/EmbeddedDatePicker";
import { useEffect, useState } from "react";
import { useProject } from "../../../hooks/useProject";

export function PublishTable() {
  const { data: project } = useProject();
  const { data: releases } = api.eventHandlers.listByReleases.useQuery(
    { projectId: project?.id ?? "" },
    { enabled: !!project }
  );

  return (
    <Table>
      {/* <TableCaption>All of your backtests.</TableCaption> */}
      <TableHeader>
        <TableRow>
          <TableHead className="">Active?</TableHead>
          <TableHead className="">Released</TableHead>
          <TableHead className="">Code</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {releases?.map((release) => {
          const isActive =
            release.releaseId ===
            project?.productionDataset?.currentEventHandlerAssignmentId;
          return (
            <TableRow key={release.releaseId}>
              <TableCell className="font-medium">
                {isActive ? (
                  <div className="bg-lime-600 h-3 w-3 rounded-full"></div>
                ) : (
                  <div className="bg-red-600 h-3 w-3 rounded-full"></div>
                )}
              </TableCell>
              <TableCell className="font-medium">
                {formatRelative(release.releasedAt, new Date())}
              </TableCell>
              <TableCell className="font-medium max-w-[20rem]">
                <EventHandlerLabel eventHandler={release.eventHandler} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

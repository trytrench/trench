import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { uniq } from "lodash";
import { useRouter } from "next/router";
import { useState } from "react";
import { EntityCard } from "~/components/EntityCard";
import { Badge } from "~/components/ui/badge";
import { Sheet, SheetContent, SheetHeader } from "~/components/ui/sheet";
import { RouterOutputs } from "~/utils/api";
import { PropertyList } from "./ui/custom/property-list";

export function EventDrawer(props: {
  selectedEvent: RouterOutputs["lists"]["getEventsList"]["rows"][number] | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { isOpen, selectedEvent, onOpenChange } = props;
  const [expandData, setExpandData] = useState(false);
  const router = useRouter();

  const eventLabels = uniq(
    selectedEvent?.labels?.filter((label) => label !== "") ?? []
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-auto">
        <SheetHeader>Event</SheetHeader>

        <div className="w-full">
          {eventLabels.length > 0 ? (
            eventLabels.map((label) => {
              return (
                <Badge key={label} className="cursor-pointer">
                  {label}
                </Badge>
              );
            })
          ) : (
            <Badge variant={"outline"}>No labels</Badge>
          )}
        </div>
        <div className="h-4"></div>
        <PropertyList
          entries={[
            {
              label: "Time",
              value:
                (selectedEvent?.timestamp &&
                  format(selectedEvent.timestamp, "MMM d, HH:mm:ss a")) ??
                "--",
            },
            {
              label: "Type",
              value: selectedEvent?.type ?? "--",
            },
            ...Object.entries(selectedEvent?.features ?? {}).map(
              ([key, value]) => ({
                label: key,
                value: value as string,
              })
            ),
          ]}
        />

        <div className="h-4"></div>
        <div className="flex items-center gap-4">
          <div className="text-sm">Data</div>
          <button
            className="px-2 py-0.5 bg-muted opacity-50 hover:opacity-60 transition"
            onClick={() => {
              setExpandData((prev) => !prev);
            }}
          >
            <DotsHorizontalIcon className="w-4 h-4" />
          </button>
        </div>
        {expandData && (
          <code className="text-xs whitespace-pre">
            {JSON.stringify(selectedEvent?.data, null, 2)}
          </code>
        )}

        <div className="h-4"></div>
        <div className="text-sm">Entities</div>
        <div className="h-4"></div>
        <div className="flex flex-col gap-2">
          {selectedEvent?.entities.map((entity) => {
            return (
              <EntityCard
                key={entity.id}
                entity={entity}
                relation={entity.relation}
                href={`/${router.query.project as string}/entity/${entity.id}`}
              />
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

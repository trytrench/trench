import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Badge, List, ListItem, Text } from "@tremor/react";
import { format } from "date-fns";
import { uniq } from "lodash";
import { useState } from "react";
import { EntityCard } from "~/components/EntityCard";
import { RouterOutputs, api } from "~/utils/api";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { useRouter } from "next/router";

export function EventDrawer(props: {
  datasetId: string;
  selectedEvent: RouterOutputs["lists"]["getEventsList"]["rows"][number] | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { isOpen, selectedEvent, onOpenChange, datasetId } = props;
  const [expandData, setExpandData] = useState(false);
  const router = useRouter();

  const eventLabels = uniq(
    selectedEvent?.labels?.filter((label) => label !== "") ?? []
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-auto">
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
            <Badge color="neutral">No labels</Badge>
          )}
        </div>
        <div className="h-4"></div>
        <List>
          <ListItem>
            <span>Time</span>
            <span>
              {selectedEvent?.timestamp &&
                format(selectedEvent.timestamp, "MMM d, HH:mm:ss a")}
            </span>
          </ListItem>
          <ListItem>
            <span>Type</span>
            <span>{selectedEvent?.type}</span>
          </ListItem>
        </List>
        <div className="h-4"></div>
        <div className="flex items-center gap-4">
          <Text>Data</Text>
          <button
            className="px-2 py-0.5 bg-gray-300 hover:bg-gray-200"
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
        <Text>Entities</Text>
        <div className="h-4"></div>
        <div className="flex flex-col gap-2">
          {selectedEvent?.entities.map((entity) => {
            return (
              <EntityCard
                key={entity.id}
                entity={entity}
                datasetId={datasetId}
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

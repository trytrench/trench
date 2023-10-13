// currently unused

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { Badge, List, ListItem, Text, Title } from "@tremor/react";
import { format } from "date-fns";
import { uniq } from "lodash";
import { ExternalLinkIcon } from "lucide-react";
import { useState } from "react";
import { RouterOutputs } from "~/utils/api";

export function EntityDrawer(props: {
  datasetId: string;
  selectedEntity:
    | RouterOutputs["lists"]["getEntitiesList"]["rows"][number]
    | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { isOpen, selectedEntity, onClose, datasetId } = props;
  const [expandData, setExpandData] = useState(false);

  const entityLabels = uniq(
    selectedEntity?.labels?.filter((label) => label !== "") ?? []
  );

  const lastSeenDate = selectedEntity?.lastSeenAt
    ? new Date(selectedEntity.lastSeenAt)
    : null;

  const entityFeatures = Object.entries(selectedEntity?.features ?? {});
  const hasFeatures = entityFeatures.length > 0;

  return (
    <Sheet isOpen={isOpen} placement="right" onClose={onClose}>
      <SheetContent>
        <SheetHeader>
          <Text className="text-gray-400 flex gap-1.5">Entity</Text>
          <a href={`/datasets/${datasetId}/entity/${selectedEntity?.id}`}>
            <Title className="flex gap-2 hover:underline">
              {selectedEntity?.type}: {selectedEntity?.name}
              <ExternalLinkIcon size={18} className="self-center" />
            </Title>
          </a>
        </SheetHeader>

        <div>
          {entityLabels.length > 0 ? (
            entityLabels.map((label) => {
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
            <span>Last Seen</span>
            <span>
              {lastSeenDate ? format(lastSeenDate, "MMM d, HH:mm:ss a") : "n/a"}
            </span>
          </ListItem>
          <ListItem>
            <span>Type</span>
            <span>{selectedEntity?.type}</span>
          </ListItem>
        </List>

        <div className="h-4"></div>
        <div className="grid grid-cols-4 gap-x-8 gap-y-4 mt-2">
          {hasFeatures ? (
            entityFeatures.map(([key, value], idx) => (
              <div key={key}>
                <Text className="font-semibold">{key}</Text>
                <Text className="truncate">
                  {value === 0
                    ? "0"
                    : value === true
                    ? "True"
                    : value === false
                    ? "False"
                    : (value as string) || "-"}
                </Text>
              </div>
            ))
          ) : (
            <Text className="text-gray-400 italic">No features</Text>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

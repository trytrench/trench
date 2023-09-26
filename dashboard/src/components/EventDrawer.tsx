import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
} from "@chakra-ui/react";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Badge, List, ListItem, Text } from "@tremor/react";
import { format } from "date-fns";
import { useState } from "react";
import { EntityCard } from "~/components/EntityCard";
import { api } from "~/utils/api";

export function EventDrawer(props: {
  selectedEventId: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { isOpen, selectedEventId, onClose } = props;
  const { data: selectedEventData } = api.lists.getEvent.useQuery(
    { eventId: selectedEventId ?? "" },
    { enabled: !!selectedEventId }
  );

  const [expandData, setExpandData] = useState(false);

  return (
    <Drawer size="lg" isOpen={isOpen} placement="right" onClose={onClose}>
      {/* <DrawerOverlay /> */}
      <DrawerContent transform="none !important">
        <DrawerCloseButton />
        <DrawerHeader>Event</DrawerHeader>

        <DrawerBody>
          <div>
            {selectedEventData?.eventLabels.map((label) => {
              return (
                <Badge
                  key={label.id}
                  color={label.color}
                  className="cursor-pointer"
                >
                  {label.name}
                </Badge>
              );
            })}
          </div>
          <div className="h-4"></div>
          <List>
            <ListItem>
              <span>Time</span>
              <span>
                {selectedEventData?.timestamp &&
                  format(selectedEventData.timestamp, "MMM d, HH:mm:ss a")}
              </span>
            </ListItem>
            <ListItem>
              <span>Type</span>
              <span>{selectedEventData?.type}</span>
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
              {JSON.stringify(selectedEventData?.data, null, 2)}
            </code>
          )}

          <div className="h-4"></div>
          <Text>Entities</Text>
          <div className="h-4"></div>
          <div className="flex flex-col gap-2">
            {selectedEventData?.entityLinks.map((link) => {
              const entity = link.entity;
              return (
                <EntityCard
                  key={link.id}
                  entity={{ ...entity, labels: entity.entityLabels }}
                  relation={link.type}
                />
              );
            })}
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

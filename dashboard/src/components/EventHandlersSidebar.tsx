import { type EventHandler } from "@prisma/client";
import { format } from "date-fns";
import { MoreHorizontalIcon } from "lucide-react";
import pluralize from "pluralize";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from "./ui/sheet";

interface Props {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  eventHandlers: EventHandler[];
  onPreviewEventHandler: (EventHandler: EventHandler) => void;
}

export const EventHandlersSidebar = ({
  eventHandlers,
  onPreviewEventHandler,
  open,
  onOpenChange,
}: Props) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>EventHandlers</SheetHeader>
        <div>
          <div>
            {eventHandlers.length}{" "}
            {pluralize("EventHandler", eventHandlers.length)}
          </div>
          <div>
            {eventHandlers.map((evHandler) => (
              <div key={evHandler.id}>
                <div className="flex justify-between items-center">
                  <div>
                    v{evHandler.version} {evHandler.description}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontalIcon className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => onPreviewEventHandler(evHandler)}
                      >
                        Preview
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center space-x-2">
                  <Avatar>
                    <AvatarFallback>BX</AvatarFallback>
                  </Avatar>
                  <div>
                    Published on {format(evHandler.createdAt, "MMM dd")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

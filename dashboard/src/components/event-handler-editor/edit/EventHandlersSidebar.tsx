import { type EventHandler } from "@prisma/client";
import { format } from "date-fns";
import { FileText, History, MoreHorizontalIcon } from "lucide-react";
import pluralize from "pluralize";
import { Avatar, AvatarFallback } from "../../ui/avatar";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from "../../ui/sheet";
import { api } from "../../../utils/api";
import { RenderCodeHash } from "../RenderCodeHash";
import { Fragment, useState } from "react";
import { Separator } from "../../ui/separator";
import { useAtom } from "jotai";
import { editorStateAtom } from "../../../global-state/editor";

export const EventHandlersSidebar = () => {
  const { data: eventHandlers } = api.eventHandlers.list.useQuery();

  const [open, setOpen] = useState(false);

  const [editorState, setEditorState] = useAtom(editorStateAtom);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>
        <Button size="icon" variant="ghost" className="ml-6">
          <History className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <span className="text-lg">Snapshot History</span>
        </SheetHeader>
        <div className="h-8"></div>
        <div>
          <div className="flex flex-col">
            {eventHandlers?.map((evHandler, idx) => (
              <Fragment key={evHandler.id}>
                {idx !== 0 && <Separator className="mb-2 mt-4" />}
                <div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm">
                      <FileText className="h-4 w-4 mr-1.5" />
                      {evHandler.description}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="iconXs">
                          <MoreHorizontalIcon className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditorState({
                              ...editorState,
                              code: evHandler.code as any,
                            });
                            setOpen(false);
                          }}
                        >
                          Load into editor
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <RenderCodeHash hashHex={evHandler.hash} size="xs" />
                    <div className="text-xs text-muted-foreground">
                      Published on {format(evHandler.createdAt, "MMM dd")}
                    </div>
                  </div>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

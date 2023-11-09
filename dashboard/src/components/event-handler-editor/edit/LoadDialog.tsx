import { FileText, FolderOpen, InfoIcon, Save } from "lucide-react";
import { ReactNode, useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { handleError } from "../../../lib/handleError";
import {
  compileStatusAtom,
  editorStateAtom,
} from "../../../global-state/editor";
import { useAtom } from "jotai";
import { RenderCodeHash } from "../RenderCodeHash";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { api } from "../../../utils/api";
import { useProject } from "../../../hooks/useProject";
import { toast } from "../../ui/use-toast";
import { SelectEventHandler } from "../SelectEventHandler";
import { EventHandler } from "../types";
import { EventHandlerLabel } from "../EventHandlerLabel";

export function LoadDialog() {
  const { data: project } = useProject();

  const [open, setOpen] = useState(false);

  const [selectedEventHandler, setSelectedEventHandler] =
    useState<EventHandler>();

  const [editorState, setEditorState] = useAtom(editorStateAtom);
  const [compileStatus, setCompileStatus] = useAtom(compileStatusAtom);

  const [message, setMessage] = useState<string>("");

  const { mutateAsync: createEventHandler } =
    api.eventHandlers.create.useMutation({});

  const triggerDisabled = compileStatus.status !== "success";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild disabled={triggerDisabled}>
        <Button variant="secondary" disabled={triggerDisabled}>
          <FolderOpen className="h-4 w-4 mr-1.5" />
          Load
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Load code snapshot</DialogTitle>
          {/* <DialogDescription>Load.</DialogDescription> */}
        </DialogHeader>

        <SelectEventHandler
          value={selectedEventHandler}
          onSelect={setSelectedEventHandler}
        />
        <DialogFooter className="">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={!selectedEventHandler}
            onClick={() => {
              if (!selectedEventHandler) {
                toast({ title: "No event handler selected" });
                return;
              }
              setEditorState({
                code: selectedEventHandler.code,
              });
              setOpen(false);
              toast({
                description: (
                  <div className="w-80 flex items-center gap-2">
                    Loaded:{" "}
                    <div className="flex-1 min-w-0">
                      <EventHandlerLabel eventHandler={selectedEventHandler} />
                    </div>
                  </div>
                ),
              });
            }}
          >
            Load
          </Button>
        </DialogFooter>
      </DialogContent>

      <DialogFooter></DialogFooter>
    </Dialog>
  );
}

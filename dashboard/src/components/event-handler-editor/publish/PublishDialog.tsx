import { ArrowRight, FileText, InfoIcon, Save } from "lucide-react";
import { useState } from "react";
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
import { EventHandlerLabel } from "../EventHandlerLabel";
import { EventHandler } from "../types";

export function PublishDialog(props: {
  originalEventHandler: EventHandler;
  newEventHandler?: EventHandler;
  renderTrigger: () => JSX.Element;
}) {
  const { renderTrigger, originalEventHandler, newEventHandler } = props;

  const { data: project } = useProject();
  const [editorState, setEditorState] = useAtom(editorStateAtom);

  const [compileStatus, setCompileStatus] = useAtom(compileStatusAtom);

  const { mutateAsync: createEventHandler } =
    api.eventHandlers.create.useMutation({});

  const triggerDisabled = compileStatus.status !== "success";

  return (
    <Dialog>
      <DialogTrigger asChild disabled={triggerDisabled}>
        {renderTrigger()}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm publish</DialogTitle>
          <DialogDescription>
            Are you sure you want to publish? New events sent to{" "}
            <code>/api/events</code> will be processed by the new code.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center w-full min-w-0">
          <EventHandlerLabel eventHandler={originalEventHandler} />
          <ArrowRight className="h-4 w-4 mx-4" />
          {newEventHandler ? (
            <div className="border px-3 py-1 rounded-md border-foreground animate-pulse flex-1 min-w-0">
              <EventHandlerLabel eventHandler={newEventHandler} />
            </div>
          ) : (
            <span>none selected</span>
          )}
        </div>

        <DialogFooter className="">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={() => {}}>
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>

      <DialogFooter></DialogFooter>
    </Dialog>
  );
}

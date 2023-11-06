import { FileText, InfoIcon, Save } from "lucide-react";
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

export function SaveDialog() {
  const { data: project } = useProject();
  const [editorState, setEditorState] = useAtom(editorStateAtom);

  const [compileStatus, setCompileStatus] = useAtom(compileStatusAtom);

  const [message, setMessage] = useState<string>("");

  const { mutateAsync: createEventHandler } =
    api.eventHandlers.create.useMutation({});

  const triggerDisabled = compileStatus.status !== "success";

  return (
    <Dialog>
      <DialogTrigger disabled={triggerDisabled}>
        <Button disabled={triggerDisabled}>
          <Save className="h-4 w-4 mr-1.5" />
          Save Snapshot
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save code snapshot</DialogTitle>
          <DialogDescription>
            Save a snapshot of your current code for testing or publishing.
          </DialogDescription>
        </DialogHeader>
        <div>
          <div className="flex items-center">
            <FileText className="h-3.5 w-3.5 mr-0.5 mb-0.5 text-muted-foreground" />
            <RenderCodeHash
              hashHex={
                compileStatus.status === "success" ? compileStatus.codeHash : ""
              }
            />
            <Popover>
              <PopoverTrigger>
                <InfoIcon className="h-3.5 w-3.5 ml-2" />
              </PopoverTrigger>
              <PopoverContent side="top" className="w-auto">
                Used to help identify your code.
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center mt-2">
            <Input
              placeholder="Message describing code (required)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={!message}
            onClick={() => {
              if (!project) {
                toast({ title: "Please select a project" });
                return;
              }

              if (compileStatus.status !== "success") {
                toast({ title: "No compiled code" });
                return;
              }

              if (!message) {
                toast({ title: "Please enter a message" });
                return;
              }

              createEventHandler({
                projectId: project.id,
                code: compileStatus.code,
                message,
              })
                .then(() => {
                  toast({ title: "Saved" });
                })
                .catch(handleError);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>

      <DialogFooter></DialogFooter>
    </Dialog>
  );
}

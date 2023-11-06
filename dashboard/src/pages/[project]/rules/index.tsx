import { type EventHandler } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "~/components/AppLayout";
import { EventHandlerEditor } from "~/components/event-handler-editor/EventHandlerEditor";
import type { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "../../../components/ui/menubar";
import { Button } from "../../../components/ui/button";
import { FolderOpen, History, Save, Upload } from "lucide-react";
import { useProject } from "../../../hooks/useProject";
import { Badge } from "../../../components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { useAtom } from "jotai";
import {
  compileStatusAtom,
  editorStateAtom,
} from "../../../global-state/editor";
import { Panel } from "../../../components/ui/custom/panel";
import { Separator } from "../../../components/ui/separator";
import { EventHandlerPreviewTest } from "../../../components/event-handler-editor/EventHandlerPreviewTest";
import { CompileStatusIndicator } from "../../../components/event-handler-editor/CompileStatusIndicator";

const MenuBar = (props: {
  onSelect?: (eventHandler: EventHandler) => void;
}) => {
  const { onSelect } = props;

  const { data: project } = useProject();

  const { data: handlers } = api.eventHandlers.listForMenubar.useQuery(
    { projectId: project!.id },
    { enabled: !!project }
  );

  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>
          <FolderOpen className="h-4 w-4 mr-2" />
          Open
        </MenubarTrigger>
        <MenubarContent>
          <MenubarSub>
            <MenubarSubTrigger disabled={!handlers?.recentEventHandlers.length}>
              Recents
            </MenubarSubTrigger>
            <MenubarSubContent>
              {handlers?.recentEventHandlers.map((handler) => (
                <MenubarItem key={handler.id}>
                  &quot;{handler.description}&quot;
                </MenubarItem>
              ))}
            </MenubarSubContent>
          </MenubarSub>
          <MenubarItem>
            &quot;{handlers?.productionEventHandler?.description}&quot;
            <Badge className="ml-1">production</Badge>
          </MenubarItem>
          <MenubarItem>Blank</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
};

const ActionButtons = (props: {
  isEditMode: boolean;
  onIsEditModeChange?: (isEditMode: boolean) => void;
}) => {
  const { isEditMode, onIsEditModeChange } = props;

  const [compileStatus] = useAtom(compileStatusAtom);

  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  return (
    <div className="flex items-center gap-2">
      {isEditMode ? (
        <>
          <CompileStatusIndicator />

          <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
            <DialogTrigger asChild>
              <Button
                className="gap-2 ml-2"
                variant="default"
                size="sm"
                disabled={compileStatus.status !== "success"}
              >
                <Save className="-ml-0 mr-0 h-4 w-4" />
                <span>Save</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Event Handler</DialogTitle>
                <DialogDescription>
                  Are you sure you want to save?
                </DialogDescription>
              </DialogHeader>
              <DialogContent className="space-y-4">
                <div className="space-y-2">
                  <Label>File Name</Label>
                  <Input id="filename" placeholder="Enter the file name" />
                </div>
              </DialogContent>
              <DialogFooter className="space-x-4">
                <Button
                  variant="secondary"
                  onClick={() => setSaveModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button>Confirm</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <>
          <Button size="icon" variant="ghost">
            <History className="h-4 w-4" />
          </Button>
          {/* <Button className="" variant="default" size="sm">
            <Upload className="-ml-1.5 mr-1.5 h-4 w-4" />
            <span>Publish</span>
          </Button> */}
        </>
      )}
    </div>
  );
};

const Page: NextPageWithLayout = () => {
  const { data: project } = useProject();

  const datasetId = useMemo(() => project?.productionDatasetId, [project]);

  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  const { data: dataset } = api.datasets.get.useQuery(
    { id: datasetId! },
    { enabled: !!datasetId }
  );

  const [compileStatus] = useAtom(compileStatusAtom);

  const [editorState, setEditorState] = useAtom(editorStateAtom);

  useEffect(() => {
    const eventHandler = dataset?.currentEventHandlerAssignment?.eventHandler;
    if (eventHandler?.code) {
      setEditorState({
        code: eventHandler.code as Record<string, string>,
      });
    }
  }, [dataset, setEditorState]);

  const [tabValue, setTabValue] = useState<string>("edit");

  return (
    <div className="h-full w-full">
      <div className="flex items-center px-3 h-16">
        <div className="flex-1 flex items-center justify-start">
          <div className="ml-4 font-bold text-lg"></div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Tabs value={tabValue} onValueChange={setTabValue}>
            <TabsList>
              <TabsTrigger value="edit">Edit Code</TabsTrigger>
              <TabsTrigger
                disabled={compileStatus.status !== "success"}
                value="preview"
              >
                Test
              </TabsTrigger>
              <TabsTrigger value="publish">Publish</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 flex items-center justify-end"></div>
      </div>
      <Separator />
      {tabValue === "edit" ? (
        <EventHandlerEditor />
      ) : (
        <EventHandlerPreviewTest />
      )}
    </div>
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

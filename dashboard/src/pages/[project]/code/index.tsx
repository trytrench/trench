import { useEffect, useMemo, useState } from "react";
import AppLayout from "~/components/AppLayout";
import { EventHandlerEditor } from "~/components/event-handler-editor/edit/EventHandlerEditor";
import type { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";
import { useProject } from "../../../hooks/useProject";

import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { useAtom } from "jotai";
import {
  compileStatusAtom,
  editorStateAtom,
} from "../../../global-state/editor";
import { Separator } from "../../../components/ui/separator";
import { TestEventHandler } from "../../../components/event-handler-editor/test/TestEventHandler";
import { PublishEventHandler } from "../../../components/event-handler-editor/publish/PublishEventHandler";

const Page: NextPageWithLayout = () => {
  const { data: project } = useProject();

  const datasetId = useMemo(() => project?.productionDatasetId, [project]);
  const [compileStatus] = useAtom(compileStatusAtom);
  const [editorState, setEditorState] = useAtom(editorStateAtom);

  const { data: dataset } = api.datasets.get.useQuery(
    { id: datasetId! },
    { enabled: !!datasetId }
  );

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
    <div className="h-full w-full flex flex-col">
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
                value="test"
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
      <div className="flex-1 overflow-auto">
        {tabValue === "edit" ? (
          <EventHandlerEditor />
        ) : tabValue === "test" ? (
          <TestEventHandler />
        ) : (
          <PublishEventHandler />
        )}
      </div>
    </div>
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

import React, { useEffect } from "react";
import { useAtom } from "jotai";

import {
  EntityPageEditorState,
  type EntityPageState,
  defaultEntityPageState,
  isEditModeAtom,
  useEditorStore,
} from "./state";
import { Button } from "../ui/button";
import { RenderComponent } from "./RenderComponent";
import { useRouter } from "next/router";
import { api } from "../../utils/api";
import { handleError } from "../../lib/handleError";
import { usePrevious } from "@dnd-kit/utilities";

export const EntityPageEditor: React.FC = () => {
  const router = useRouter();
  const entityType = decodeURIComponent(router.query.entityType as string);
  const entityId = decodeURIComponent(router.query.entityId as string);

  const { data: entityPage, isLoading } = api.entityTypes.getPage.useQuery(
    { entityTypeId: entityType },
    { enabled: !!entityType, refetchOnWindowFocus: false }
  );

  const { mutateAsync: upsertPage } = api.entityTypes.upsertPage.useMutation();

  const [isEditMode, setIsEditMode] = useAtom(isEditModeAtom);

  const pageState = useEditorStore.use.pageState();
  const setEntityPageState = useEditorStore.use.setPageState();

  // Sync state
  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (entityPage) {
      setEntityPageState(entityPage.config as unknown as EntityPageState);
    } else {
      setEntityPageState(defaultEntityPageState);
    }
  }, [entityPage, isLoading, setEntityPageState]);

  // Autosave when exiting edit mode
  const prevEditMode = usePrevious(isEditMode);
  useEffect(() => {
    if (!isEditMode && prevEditMode && pageState) {
      upsertPage({
        entityTypeId: entityType,
        config: pageState,
      }).catch(handleError);
    }
  }, [entityType, isEditMode, pageState, prevEditMode, upsertPage]);

  const clearEntityPageState = () => {
    setEntityPageState(defaultEntityPageState);
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        <Button onClick={toggleEditMode}>{isEditMode ? "Save" : "Edit"}</Button>
        {isEditMode && <Button onClick={clearEntityPageState}>reset</Button>}
      </div>

      {pageState && (
        <RenderComponent
          id={pageState.root}
          entity={{
            id: entityId,
            type: entityType,
          }}
        />
      )}
    </div>
  );
};

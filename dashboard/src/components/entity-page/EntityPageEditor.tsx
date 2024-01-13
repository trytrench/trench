import React, { useEffect } from "react";
import { useAtom } from "jotai";

import {
  EntityPageState,
  defaultEntityPageState,
  entityPageStateAtom,
  isEditModeAtom,
} from "./state";
import { Button } from "../ui/button";
import { RenderComponent } from "./RenderComponent";
import { useRouter } from "next/router";
import { EntityProvider } from "./context/EntityContext";
import { api } from "../../utils/api";
import { handleError } from "../../lib/handleError";
import { usePrevious } from "@dnd-kit/utilities";

export const EntityPageEditor: React.FC = () => {
  const router = useRouter();
  const entityType = decodeURIComponent(router.query.entityType as string);
  const entityId = decodeURIComponent(router.query.entityId as string);

  const { data: entityPage, isLoading } = api.entityTypes.getPage.useQuery(
    { entityTypeId: entityType },
    { enabled: !!entityType }
  );

  const { mutateAsync: upsertPage } = api.entityTypes.upsertPage.useMutation();

  const [isEditMode, setIsEditMode] = useAtom(isEditModeAtom);

  const [pageConfig, setEntityPageState] = useAtom(entityPageStateAtom);

  // Sync state
  useEffect(() => {
    if (isLoading) {
      return;
    }
    console.log("page", entityPage);
    if (entityPage) {
      setEntityPageState(entityPage.config as unknown as EntityPageState);
    } else {
      setEntityPageState(defaultEntityPageState);
    }
  }, [entityPage, isLoading, setEntityPageState]);

  // Autosave when exiting edit mode
  const prevEditMode = usePrevious(isEditMode);
  useEffect(() => {
    if (!isEditMode && prevEditMode && pageConfig) {
      upsertPage({
        entityTypeId: entityType,
        config: pageConfig,
      }).catch(handleError);
    }
  }, [entityType, isEditMode, pageConfig, prevEditMode, upsertPage]);

  const clearEntityPageState = () => {
    setEntityPageState(null);
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

      <EntityProvider entityId={entityId} entityType={entityType}>
        {pageConfig && <RenderComponent id={pageConfig.root} />}
      </EntityProvider>
    </div>
  );
};

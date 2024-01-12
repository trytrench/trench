import React from "react";
import { useAtom } from "jotai";

import {
  defaultEntityPageState,
  entityPageStateAtom,
  isEditModeAtom,
} from "./state";
import { Button } from "../ui/button";
import { RenderComponent } from "./RenderComponent";
import { useRouter } from "next/router";
import { EntityProvider } from "./context/EntityContext";

export const EntityPageEditor: React.FC = () => {
  const [{ root }, setEntityPageState] = useAtom(entityPageStateAtom);

  const [isEditMode, setIsEditMode] = useAtom(isEditModeAtom);

  const clearEntityPageState = () => {
    setEntityPageState(defaultEntityPageState);
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  const router = useRouter();
  const entityType = decodeURIComponent(router.query.entityType as string);
  const entityId = decodeURIComponent(router.query.entityId as string);

  return (
    <div>
      <Button onClick={clearEntityPageState}>reset</Button>

      <Button onClick={toggleEditMode}>
        {isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
      </Button>

      <EntityProvider entityId={entityId} entityType={entityType}>
        <RenderComponent id={root} />
      </EntityProvider>
    </div>
  );
};

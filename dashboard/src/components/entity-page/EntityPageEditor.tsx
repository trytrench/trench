import React from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import { useAtom } from "jotai";

import {
  defaultEntityPageState,
  entityPageStateAtom,
  isEditModeAtom,
} from "./state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { COMPONENT_REGISTRY, ComponentConfig } from "./components";
import { type ComponentType } from "./components/_enum";
import { Button } from "../ui/button";
import { RenderComponent } from "./RenderComponent";

export const EntityPageEditor: React.FC = () => {
  const [{ root, components }, setEntityPageState] =
    useAtom(entityPageStateAtom);

  const [isEditMode, setIsEditMode] = useAtom(isEditModeAtom);

  const clearEntityPageState = () => {
    setEntityPageState(defaultEntityPageState);
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  return (
    <div>
      <Button onClick={clearEntityPageState}>reset</Button>
      <Button onClick={toggleEditMode}>
        {isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
      </Button>

      <RenderComponent id={root} />
    </div>
  );
};

import { atom, useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import { getComponent, type ComponentConfig } from "./components";
import { ComponentType } from "./components/_enum";
import { StoreApi, UseBoundStore, create } from "zustand";
import { persist } from "zustand/middleware";
import { createSelectors } from "../../lib/zustand";
import { SetStateAction } from "react";

export const isEditModeAtom = atom(false);

export const defaultEntityPageState: EntityPageState = {
  root: "root",
  components: {
    root: {
      type: ComponentType.VerticalList,
      config: {
        items: ["title"],
      },
    },
    title: {
      type: ComponentType.Title,
      config: {
        title: "Hello World",
      },
    },
  },
};

export interface EntityPageState {
  root: string;
  components: Record<string, ComponentConfig>;
}

export interface EntityPageEditorState {
  /**
   * If null, the page is not loaded
   */
  pageState: EntityPageState | null;

  setPageState: (state: SetStateAction<EntityPageState | null>) => void;
  setComponent: (
    id: string,
    config: SetStateAction<ComponentConfig | undefined>
  ) => void;
  deleteComponent: (id: string) => void;
}
const useEditorStoreBase = create<EntityPageEditorState>()(
  persist<EntityPageEditorState>(
    (set, get) => ({
      pageState: null,
      setPageState: (arg) => {
        set((prev) => {
          if (typeof arg === "function") {
            arg = arg(prev.pageState);
          }
          return { pageState: arg };
        });
      },
      setComponent: (id, arg) => {
        set((prev) => {
          if (!prev.pageState) return prev;

          const componentState = prev.pageState.components[id];

          if (typeof arg === "function") {
            arg = arg(componentState);
          }

          const newComponents = prev.pageState.components;
          if (arg === undefined) {
            delete newComponents[id];
          } else {
            newComponents[id] = arg;
          }

          return {
            ...prev,
            pageState: {
              ...prev.pageState,
              components: newComponents,
            },
          };
        });
      },
      deleteComponent: (id) => {
        set((prev) => {
          if (!prev.pageState) return prev;

          const newComponents = prev.pageState.components;

          const deleteComponentAndChildren = (id: string) => {
            const component = newComponents[id];
            if (!component) return;

            const getChildrenIds = getComponent(component.type).getChildrenIds;
            const childrenIds = getChildrenIds(component.config);
            for (const childId of childrenIds) {
              deleteComponentAndChildren(childId);
            }

            delete newComponents[id];
          };

          deleteComponentAndChildren(id);

          return {
            ...prev,
            pageState: {
              ...prev.pageState,
              components: newComponents,
            },
          };
        });
      },
    }),
    {
      name: "entity-page-editor",
    }
  )
);

export const useEditorStore = createSelectors(useEditorStoreBase);

export const selectors = {
  getComponent: (id: string) => (state: EntityPageEditorState) =>
    state.pageState?.components[id],
};

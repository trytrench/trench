import { atom, useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import { COMPONENT_REGISTRY, type ComponentConfig } from "./components";
import { ComponentType } from "./components/_enum";

export const isEditModeAtom = atom(false);
export interface EntityPageState {
  root: string;
  components: Record<string, ComponentConfig>;
}

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

export const entityPageStateAtom = atom<EntityPageState | null>(null);

import { atom, useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import { COMPONENT_REGISTRY, type ComponentConfig } from "./components";
import { ComponentType } from "./components/_enum";

export const entityIdAtom = atom("");
export const isEditModeAtom = atom(false);

interface EntityPageState {
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

export const entityPageStateAtom = atomWithStorage<EntityPageState>(
  "entityPageState",
  defaultEntityPageState
);

import { useAtom } from "jotai";
import { entityPageStateAtom } from "./state";
import { ComponentConfigMap } from "./components";
import { ComponentType } from "./components/_enum";
import { SetStateAction } from "react";

export function useComponentConfig<T extends ComponentType>(id: string) {
  const [state, setState] = useAtom(entityPageStateAtom);
  const config = state.components[id] as ComponentConfigMap[T];
  const setConfig = (config: SetStateAction<ComponentConfigMap[T]>) => {
    setState((prev) => {
      if (typeof config === "function") {
        config = config(prev.components[id] as ComponentConfigMap[T]);
      }
      return {
        ...state,
        components: {
          ...state.components,
          [id]: config,
        },
      };
    });
  };

  if (!config) {
    throw new Error(`Component with id ${id} not found`);
  }

  return [config, setConfig] as const;
}

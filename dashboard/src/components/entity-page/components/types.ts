import { type ReactNode, type SetStateAction } from "react";

export type EntityPageComponent<TConfig> = (props: {
  id: string;
  entity: {
    type: string;
    id: string;
  };
  config: TConfig;
  setConfig: (arg: SetStateAction<TConfig>) => void;
}) => ReactNode;

import { ReactNode } from "react";

export type EntityPageComponent<TConfig> = (props: {
  id: string;
  entity: {
    type: string;
    id: string;
  };
  config: TConfig;
}) => ReactNode;

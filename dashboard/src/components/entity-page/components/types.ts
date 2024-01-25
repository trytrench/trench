import { ReactNode } from "react";

export type EntityPageComponent<TConfig> = (props: {
  id: string;
  config: TConfig;
}) => ReactNode;

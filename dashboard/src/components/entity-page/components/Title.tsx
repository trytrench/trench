import { EntityPageComponent } from "./types";

export interface TitleConfig {
  title: string;
}

export const TitleComponent: EntityPageComponent<TitleConfig> = ({
  config,
}) => {
  // Component implementation

  return (
    <div>
      <div className="text-lg font-bold">{config.title}</div>
    </div>
  );
};

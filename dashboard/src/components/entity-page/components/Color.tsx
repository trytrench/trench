import { useAtom } from "jotai";
import { ComponentType } from "./_enum";
import { EntityPageComponent } from "./types";
import { isEditModeAtom } from "../state";
import { Input } from "../../ui/input";
import { EditModeFrame } from "../EditModeOverlay";

export interface ColorConfig {
  color: string;
}

export const ColorComponent: EntityPageComponent<ColorConfig> = ({
  id,
  config,
  setConfig,
}) => {
  // Component implementation

  const [isEditMode] = useAtom(isEditModeAtom);
  return (
    <EditModeFrame
      renderEditModeControls={() => (
        <Input
          value={config.color}
          onChange={(e) => {
            setConfig({
              color: e.target.value,
            });
          }}
        />
      )}
    >
      <div
        className="text-lg font-bold h-40 text-black"
        style={{ backgroundColor: config.color }}
      ></div>
    </EditModeFrame>
  );
};

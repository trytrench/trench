import { useAtom } from "jotai";
import { cn } from "../../lib/utils";
import { isEditModeAtom } from "./state";

export function EditModeOverlay(props: {
  children: React.ReactNode;
  className?: string;
  isEditMode: boolean;
  renderEditModeControls?: () => React.ReactNode;
}) {
  const { children, isEditMode, renderEditModeControls, className } = props;
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {children}
      {isEditMode && (
        <div className="absolute inset-0 h-full w-full bg-black bg-opacity-50">
          {renderEditModeControls?.()}
        </div>
      )}
    </div>
  );
}

export function EditModeFrame(props: {
  children: React.ReactNode;
  className?: string;
  renderEditModeControls?: () => React.ReactNode;
  childrenVisibleInEditMode?: boolean;
}) {
  const {
    children,
    renderEditModeControls,
    className,
    childrenVisibleInEditMode = false,
  } = props;

  const [isEditMode] = useAtom(isEditModeAtom);

  return (
    <div className={cn("relative", className)}>
      {isEditMode && (
        <div className="absolute h-full w-full">
          {renderEditModeControls?.()}
        </div>
      )}
      <div
        className={cn({
          "pointer-events-none": isEditMode,
          "opacity-0": isEditMode && !childrenVisibleInEditMode,
        })}
      >
        {children}
      </div>
    </div>
  );
}

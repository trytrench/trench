import { cn } from "../../lib/utils";

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
  isEditMode: boolean;
  renderEditModeControls?: () => React.ReactNode;
}) {
  const { children, isEditMode, renderEditModeControls, className } = props;
  return (
    <div className={cn("relative", className)}>
      {isEditMode && <div>{renderEditModeControls?.()}</div>}
      {children}
    </div>
  );
}

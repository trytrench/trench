import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { isEditModeAtom, selectors, useEditorStore } from "./state";
import { useAtom } from "jotai";
import { MoveIcon, TrashIcon } from "lucide-react";

export const DraggableItem = ({
  id,
  onDelete,
  children,
}: {
  id: string;
  onDelete?: (id: string) => void;
  children: React.ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const component = useEditorStore(selectors.getComponent(id));

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const [isEditMode] = useAtom(isEditModeAtom);
  return (
    <div className="relative" ref={setNodeRef} style={style} {...attributes}>
      {isEditMode && (
        <div className="flex items-center justify-between bg-gray-300 w-full">
          <div {...listeners} className="p-2 flex items-center gap-2">
            <MoveIcon className="h-4 w-4" />
            {component?.type}
          </div>
          <div>
            <TrashIcon
              className="h-4 w-4"
              onClick={() => {
                onDelete?.(id);
              }}
            />
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

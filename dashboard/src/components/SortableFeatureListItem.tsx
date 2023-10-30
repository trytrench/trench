import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FeatureListItem, type FeatureListItemProps } from "./FeatureListItem";

export interface SortableFeatureListItemProps extends FeatureListItemProps {
  id: string;
}

export function SortableFeatureListItem({
  id,
  ...props
}: SortableFeatureListItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <FeatureListItem
      {...attributes}
      {...listeners}
      {...props}
      ref={setNodeRef}
      style={style}
    />
  );
}

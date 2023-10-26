import React, { useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableFeatureListItem } from "./SortableFeatureListItem";
import { FeatureListItem } from "./FeatureListItem";
import { FeatureMetadata } from "@prisma/client";

interface Props {
  features: { id: string; feature: string; metadata?: FeatureMetadata }[];
  onFeatureChange: (value: any, item: any) => void;
  onOrderChange: (features: string[]) => void;
}

export function FeatureList({
  features,
  onFeatureChange,
  onOrderChange,
}: Props) {
  const [activeId, setActiveId] = useState(null);
  const [items, setItems] = useState(features);

  useEffect(() => {
    setItems(features);
  }, [features]);

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId),
    [activeId, items]
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableFeatureListItem
            key={item.id}
            id={item.id}
            feature={item.id}
            name={item.metadata?.name}
            dataType={item.metadata?.dataType ?? "text"}
            hidden={item.metadata?.hidden ?? false}
            onFeatureChange={(value) => onFeatureChange(value, item)}
          />
        ))}
      </SortableContext>
      <DragOverlay>
        {activeId ? (
          <FeatureListItem
            feature={activeItem.id}
            name={activeItem.metadata?.name}
            dataType={activeItem.metadata?.dataType ?? "text"}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );

  function handleDragStart(event) {
    const { active } = event;

    setActiveId(active.id);
  }

  function handleDragEnd(event) {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      onOrderChange(newItems.map((item) => item.id));

      setItems(newItems);
    }

    setActiveId(null);
  }
}

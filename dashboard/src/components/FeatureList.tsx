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
import { type Feature } from "@prisma/client";

interface Props {
  features: Feature[];
  onDataTypeChange: (dataType: string, feature: Feature) => void;
  onRename: (name: string, feature: Feature) => void;
  onOrderChange?: (features: string[]) => void;
  onToggleHide: (hidden: boolean, feature: Feature) => void;
}

export function FeatureList({
  features,
  onDataTypeChange,
  onRename,
  onOrderChange,
  onToggleHide,
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
            feature={item.feature}
            name={item.feature}
            dataType={item.dataType ?? "text"}
            hidden={item.hidden ?? false}
            onDataTypeChange={
              onDataTypeChange
                ? (dataType) => onDataTypeChange(dataType, item)
                : undefined
            }
            onRename={onRename ? (name) => onRename(name, item) : undefined}
            onToggleHide={
              onToggleHide ? (hidden) => onToggleHide(hidden, item) : undefined
            }
            draggable={!onOrderChange}
          />
        ))}
      </SortableContext>
      <DragOverlay>
        {activeId ? (
          <FeatureListItem
            feature={activeItem.id}
            name={activeItem.feature}
            dataType={activeItem.dataType ?? "text"}
            draggable={!onOrderChange}
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

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TypeName } from "event-processing";
import { GripVertical, X } from "lucide-react";
import { AnnotatedFeature } from "~/shared/types";
import { EntityChip } from "./EntityChip";
import { RenderResult } from "./RenderResult";

const SortableFeature = ({
  id,
  name,
  result,
  entityNameMap,
  onDelete,
  isEditing,
}: {
  id: string;
  name: string;
  result: AnnotatedFeature["result"];
  entityNameMap: Record<string, string>;
  onDelete: () => void;
  isEditing?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center">
        {isEditing && (
          <GripVertical
            className="cursor-pointer w-4 h-4 shrink-0"
            {...attributes}
            {...listeners}
          />
        )}
        <div className="font-semibold truncate">{name}</div>
        {isEditing && (
          <X className="ml-auto cursor-pointer w-4 h-4" onClick={onDelete} />
        )}
      </div>
      <div className="truncate">
        {result.type === "success" &&
        result.data.schema.type === TypeName.Entity ? (
          <EntityChip
            entityId={result.data.value.id}
            entityType={result.data.value.type}
            name={entityNameMap[result.data.value.id] ?? result.data.value.id}
            href={`/entity/${result.data.value.type}/${result.data.value.id}`}
          />
        ) : (
          <RenderResult result={result} />
        )}
      </div>
    </div>
  );
};

interface Props {
  features: AnnotatedFeature[];
  entityNameMap: Record<string, string>;
  cols?: number;
  isEditing?: boolean;
  featureOrder: string[];
  onFeatureOrderChange: (newOrder: string[]) => void;
}

export const SortableFeatureGrid = ({
  features,
  entityNameMap,
  cols = 5,
  featureOrder,
  onFeatureOrderChange,
  isEditing,
}: Props) => {
  const rulesToShow = features.filter(
    (feature) =>
      feature.rule &&
      feature.result.type === "success" &&
      feature.result.data.value
  );
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (typeof active.id !== "string" || typeof over?.id !== "string") return;

    const oldIndex = featureOrder.indexOf(active.id);
    const newIndex = featureOrder.indexOf(over.id);
    if (active.id !== over.id) {
      onFeatureOrderChange(arrayMove(featureOrder, oldIndex, newIndex));
    }
  }

  return features.length > 0 ? (
    <>
      {rulesToShow.length > 0 && (
        <div
          className={`grid grid-cols-${cols} gap-x-8 gap-y-2 text-sm text-foreground mb-4`}
        >
          {rulesToShow.map(({ featureId, featureName, rule }) => (
            <div key={featureId} className="flex space-x-1 items-center">
              <div className={`rounded-full ${rule!.color} w-2 h-2 shrink-0`} />
              <div className="font-semibold truncate">{featureName}</div>
            </div>
          ))}
        </div>
      )}

      <div
        className={`grid grid-cols-${cols} gap-x-8 gap-y-2 text-sm text-foreground`}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={features
              .filter(
                (feature) =>
                  !feature.rule && featureOrder.includes(feature.featureId)
              )
              .map((feature) => feature.featureId)}
          >
            {features
              .filter(
                (feature) =>
                  !feature.rule && featureOrder.includes(feature.featureId)
              )
              .sort((a, b) => {
                return (
                  featureOrder.indexOf(a.featureId) -
                  featureOrder.indexOf(b.featureId)
                );
              })
              .map(({ featureId, featureName, result }) => (
                <SortableFeature
                  key={featureId}
                  id={featureId}
                  name={featureName}
                  result={result}
                  entityNameMap={entityNameMap}
                  onDelete={() => {
                    onFeatureOrderChange(
                      featureOrder.filter((id) => id !== featureId)
                    );
                  }}
                  isEditing={isEditing}
                />
              ))}
          </SortableContext>
        </DndContext>
      </div>
    </>
  ) : (
    <div className="italic text-gray-400">No features</div>
  );
};

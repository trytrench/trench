import { useAtom } from "jotai";
import { ComponentType } from "./_enum";
import { EntityPageComponent } from "./types";
import { isEditModeAtom, useEditorStore } from "../state";
import { Input } from "../../ui/input";
import { EditModeFrame } from "../EditModeOverlay";
import {
  useSensors,
  useSensor,
  PointerSensor,
  DragEndEvent,
  DndContext,
  closestCenter,
  MouseSensor,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@radix-ui/react-popover";
import { nanoid } from "nanoid";
import { COMPONENT_REGISTRY, ComponentConfig } from ".";
import { RenderComponent } from "../RenderComponent";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../../ui/command";
import { Button } from "../../ui/button";
import { DraggableItem } from "../DraggableItem";

export interface FeatureGridConfig {
  title: string;
  featureDraggableIds: string[];
}

export const FeatureGridComponent: EntityPageComponent<FeatureGridConfig> = ({
  id,
  entity,
  config,
  setConfig,
}) => {
  const sensors = useSensors(useSensor(MouseSensor));

  const [isEditMode, setIsEditMode] = useAtom(isEditModeAtom);

  const deleteComponent = useEditorStore.use.deleteComponent();

  const setState = useEditorStore.use.setPageState();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setConfig((config) => {
        const { featureDraggableIds: currentItems } = config;
        const oldIndex = currentItems.indexOf(active.id.toString());
        const newIndex = currentItems.indexOf(over.id.toString());
        return {
          ...config,
          featureDraggableIds: arrayMove(currentItems, oldIndex, newIndex),
        };
      });
    }
  };

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={config.featureDraggableIds}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-3">
            {config.featureDraggableIds.map((id) => (
              <DraggableItem
                key={id}
                id={id}
                onDelete={() => {
                  setConfig((config) => {
                    const { featureDraggableIds: currentItems } = config;
                    return {
                      ...config,
                      featureDraggableIds: currentItems.filter((i) => i !== id),
                    };
                  });
                  deleteComponent(id);
                }}
              >
                <RenderComponent key={id} id={id} entity={entity} />
              </DraggableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {isEditMode && (
        <Button
          onClick={() => {
            setState((prev) => {
              if (!prev) return prev;

              const prevGrid = prev?.components[id] as
                | ComponentConfig<ComponentType.FeatureGrid>
                | undefined;
              if (!prevGrid) {
                return prev;
              }

              const componentId = nanoid();

              return {
                ...prev,
                components: {
                  ...prev.components,
                  // Add item to vertical list items
                  [id]: {
                    ...prevGrid,
                    config: {
                      ...prevGrid.config,
                      featureDraggableIds: [
                        ...prevGrid.config.featureDraggableIds,
                        componentId,
                      ],
                    },
                  },
                  [componentId]: {
                    type: ComponentType.Feature,
                    config: {
                      featurePath: [],
                    },
                  },
                },
              };
            });
          }}
        >
          Add Feature
        </Button>
      )}
    </div>
  );
};

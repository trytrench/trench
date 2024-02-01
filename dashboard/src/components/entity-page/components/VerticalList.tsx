import React from "react";
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { EntityPageComponent } from "./types";
import { Button } from "../../ui/button";
import { isEditModeAtom, useEditorStore } from "../state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { COMPONENT_REGISTRY, ComponentConfig } from ".";
import { useAtom } from "jotai";
import { ComponentType } from "./_enum";
import { nanoid } from "nanoid";
import { RenderComponent } from "../RenderComponent";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../../ui/command";
import { DraggableItem } from "../DraggableItem";

export interface VerticalListConfig {
  items: string[];
}

export const VerticalListComponent: EntityPageComponent<VerticalListConfig> = ({
  id,
  entity,
  config,
  setConfig,
}) => {
  const sensors = useSensors(useSensor(PointerSensor));

  const [isEditMode, setIsEditMode] = useAtom(isEditModeAtom);

  const setState = useEditorStore.use.setPageState();
  const deleteComponent = useEditorStore.use.deleteComponent();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setConfig((config) => {
        const { items: currentItems } = config;
        const oldIndex = currentItems.indexOf(active.id.toString());
        const newIndex = currentItems.indexOf(over.id.toString());
        return {
          items: arrayMove(currentItems, oldIndex, newIndex),
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
          items={config.items}
          strategy={verticalListSortingStrategy}
        >
          {config.items.map((id) => {
            return (
              <DraggableItem
                key={id}
                id={id}
                onDelete={() => {
                  setConfig((config) => {
                    const { items: currentItems } = config;
                    const newItems = currentItems.filter((item) => item !== id);
                    return {
                      items: newItems,
                    };
                  });
                  deleteComponent(id);
                }}
              >
                <RenderComponent id={id} entity={entity} />
              </DraggableItem>
            );
          })}
        </SortableContext>
      </DndContext>
      {isEditMode && (
        <Popover>
          <PopoverTrigger asChild>
            <Button>Add Component</Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search framework..." />
              <CommandEmpty>No framework found.</CommandEmpty>
              <CommandGroup>
                {Object.values(COMPONENT_REGISTRY).map((registryConfig) => (
                  <CommandItem
                    key={registryConfig.type}
                    onSelect={() => {
                      const value = registryConfig;
                      setState((prev) => {
                        if (!prev) return prev;

                        const prevVertList = prev?.components[id] as
                          | ComponentConfig<ComponentType.VerticalList>
                          | undefined;
                        if (!prevVertList) {
                          return prev;
                        }

                        const componentId = nanoid();

                        return {
                          ...prev,
                          components: {
                            ...prev.components,
                            // Add item to vertical list items
                            [id]: {
                              ...prevVertList,
                              config: {
                                items: [
                                  ...prevVertList.config.items,
                                  componentId,
                                ],
                              },
                            },
                            [componentId]: {
                              type: value.type,
                              config: value.defaultConfig,
                            },
                          },
                        };
                      });
                    }}
                  >
                    {registryConfig.type}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

/*


*/

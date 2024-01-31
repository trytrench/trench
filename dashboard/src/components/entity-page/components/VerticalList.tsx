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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EntityPageComponent } from "./types";
import { Button } from "../../ui/button";
import { entityPageStateAtom, isEditModeAtom } from "../state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { COMPONENT_REGISTRY, ComponentConfig, ComponentConfigMap } from ".";
import { useAtom } from "jotai";
import { ComponentType } from "./_enum";
import { nanoid } from "nanoid";
import { RenderComponent } from "../RenderComponent";
import { useComponentConfig } from "../useComponentConfig";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../../ui/command";

export interface VerticalListConfig {
  items: string[];
}

const SortableItem = ({
  id,
  entity,
}: {
  id: string;
  entity: {
    id: string;
    type: string;
  };
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const [isEditMode] = useAtom(isEditModeAtom);

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      className="p-2 border relative"
      ref={setNodeRef}
      style={style}
      {...attributes}
    >
      {/* Render your item based on id */}
      <RenderComponent id={id} entity={entity} />
      {isEditMode && (
        <div
          {...listeners}
          className="absolute bottom-0 right-0 h-4 w-4 bg-gray-200"
        ></div>
      )}
    </div>
  );
};

export const VerticalListComponent: EntityPageComponent<VerticalListConfig> = ({
  id,
  entity,
}) => {
  const sensors = useSensors(useSensor(PointerSensor));

  const [isEditMode, setIsEditMode] = useAtom(isEditModeAtom);
  const [{ config }, setConfig] =
    useComponentConfig<ComponentType.VerticalList>(id);

  const [state, setState] = useAtom(entityPageStateAtom);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setConfig((config) => {
        const { items: currentItems } = config.config;
        const oldIndex = currentItems.indexOf(active.id.toString());
        const newIndex = currentItems.indexOf(over.id.toString());
        return {
          ...config,
          config: {
            items: arrayMove(currentItems, oldIndex, newIndex),
          },
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
          {config.items.map((id) => (
            <SortableItem key={id} id={id} entity={entity} />
          ))}
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

                        const prevComponent = prev?.components[id] as
                          | ComponentConfigMap[ComponentType.VerticalList]
                          | undefined;
                        if (!prevComponent) {
                          console.log("no prev component");
                          return prev;
                        }
                        const newId = nanoid();
                        return {
                          ...prev,
                          components: {
                            ...prev.components,
                            [id]: {
                              ...prevComponent,
                              config: {
                                items: [...prevComponent.config.items, newId],
                              },
                            },
                            [newId]: {
                              type: value.type,
                              config: value.defaultConfig,
                            } as any,
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

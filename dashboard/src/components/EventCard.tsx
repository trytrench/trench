import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { FnType, hasFnType } from "event-processing";
import { sortBy } from "lodash";
import { useCallback } from "react";
import { useDecision } from "~/hooks/useDecision";
import type { EventViewConfig } from "~/shared/validation";
import type { RouterOutputs } from "~/utils/api";
import { RenderDecision } from "./RenderDecision";
import { selectors, useEditorStore } from "./nodes/editor/state/zustand";
import { Button } from "./ui/button";
import { Panel } from "./ui/custom/panel";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { EventCardSection } from "./EventCardSection";
import { MoreHorizontal } from "lucide-react";

interface Props {
  event: RouterOutputs["lists"]["getEventsList"]["rows"][number];
  isFirst: boolean;
  isLast: boolean;
  entityNameMap: Record<string, string>;
  config: EventViewConfig["gridConfig"][string];
  onConfigChange: (newConfig: EventViewConfig["gridConfig"][string]) => void;
  isEditing?: boolean;
}

export function EventCard({
  event,
  isFirst,
  isLast,
  entityNameMap,
  config,
  onConfigChange,
  isEditing = false,
}: Props) {
  const decision = useDecision(event.features);

  const nodes = useEditorStore(
    selectors.getNodeDefs({ eventType: event.type })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = config.entityTypeOrder.indexOf(active.id as string);
        const newIndex = config.entityTypeOrder.indexOf(over.id as string);
        const newOrder = arrayMove(config.entityTypeOrder, oldIndex, newIndex);

        onConfigChange({
          ...config,
          entityTypeOrder: newOrder,
        });
      }
    },
    [onConfigChange, config]
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedEntityTypes = sortBy(
    event.entities.filter((entity) =>
      config.entityTypeOrder.includes(entity.type)
    ),
    (entity) => config.entityTypeOrder.indexOf(entity.type)
  );

  return (
    <div className="flex">
      <div className="w-[3rem] relative shrink-0">
        <div className="absolute left-0 w-[2px] bg-muted-foreground ml-3 h-full" />
        <div className="absolute w-[14px] h-[14px] left-[6px] top-[24px] rounded-full bg-background border-2 border-muted-foreground" />
        {isFirst && (
          <div className="absolute top-0 w-full h-4 bg-gradient-to-b from-background" />
        )}
        {isLast && (
          <div className="absolute bottom-0 w-full h-12 bg-gradient-to-t from-background" />
        )}
      </div>
      <div className="w-[16rem] mt-4">
        <div className="flex">
          <h1 className="text-lg text-emphasis-foreground">{event.type}</h1>
        </div>
        <div className="text-xs text-muted-foreground">
          {format(new Date(event.timestamp), "MMM d, yyyy h:mm:ss a")}
        </div>
        <div className="flex text-sm items-center mt-2">
          {isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden mb-4 h-8 lg:flex"
                >
                  <MixerHorizontalIcon className="mr-2 h-4 w-4" />
                  View
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[150px] max-h-[400px] overflow-auto"
              >
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {nodes
                  .filter((node) => hasFnType(node, FnType.EntityAppearance))
                  .map((node) => (
                    <DropdownMenuCheckboxItem
                      key={node.id}
                      className="capitalize"
                      // Assumes that an event will have one entity per entity type
                      checked={
                        hasFnType(node, FnType.EntityAppearance) &&
                        config.entityTypeOrder.includes(
                          node.fn.returnSchema.entityType
                        )
                      }
                      onCheckedChange={(value) => {
                        if (hasFnType(node, FnType.EntityAppearance)) {
                          onConfigChange(
                            value
                              ? {
                                  ...config,
                                  entityTypeOrder: [
                                    ...config.entityTypeOrder,
                                    node.fn.returnSchema.entityType,
                                  ],
                                }
                              : {
                                  ...config,
                                  entityTypeOrder:
                                    config.entityTypeOrder.filter(
                                      (id) =>
                                        id !== node.fn.returnSchema.entityType
                                    ),
                                }
                          );
                        }
                      }}
                      onSelect={(event) => event.preventDefault()}
                    >
                      {node.name}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {/* {decision && <RenderDecision decision={decision} />} */}
        </div>
      </div>
      <Panel className="mt-3 min-w-0 flex-1 text-sm text-muted-foreground">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToParentElement, restrictToVerticalAxis]}
        >
          <SortableContext
            items={sortedEntityTypes.map((entity) => entity.type)}
            strategy={verticalListSortingStrategy}
          >
            {sortedEntityTypes.map((entity) => (
              <EventCardSection
                id={entity.type}
                key={entity.id}
                entity={entity}
                entityNameMap={entityNameMap}
                isEditing={isEditing}
                config={config}
                onConfigChange={onConfigChange}
                event={event}
              />
            ))}
          </SortableContext>
        </DndContext>
      </Panel>
    </div>
  );
}

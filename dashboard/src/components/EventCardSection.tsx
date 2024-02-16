import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { type Entity } from "event-processing";
import { GripVertical, MoreHorizontal } from "lucide-react";
import { type EventViewConfig } from "~/shared/validation";
import { type RouterOutputs, api } from "~/utils/api";
import { EntityChip } from "./EntityChip";
import { SortableFeatureGrid } from "./SortableFeatureGrid";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export const EventCardSection = ({
  id,
  entity,
  entityNameMap,
  isEditing,
  config,
  onConfigChange,
  event,
}: {
  id: string;
  entity: Entity;
  entityNameMap: Record<string, string>;
  isEditing?: boolean;
  config: EventViewConfig["gridConfig"][string];
  onConfigChange: (newConfig: EventViewConfig["gridConfig"][string]) => void;
  event: RouterOutputs["lists"]["getEventsList"]["rows"][number];
}) => {
  const { data: features } = api.features.list.useQuery();
  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div className="mb-8 bg-background" ref={setNodeRef} style={style}>
      <div className="flex items-center mb-2">
        {isEditing && (
          <GripVertical
            className="cursor-pointer w-4 h-4 shrink-0"
            {...attributes}
            {...listeners}
          />
        )}

        <div className="text-md mr-1">
          {
            entityTypes?.find((entityType) => entityType.id === entity.type)
              ?.type
          }
        </div>

        <EntityChip
          entityId={entity.id}
          entityType={entity.type}
          name={entityNameMap[entity.id] ?? entity.id}
          href={`/entity/${entity.type}/${entity.id}`}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="iconXs" variant="link" className="h-3">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent>
            <DropdownMenuItem
              onSelect={() => {
                // onIsEditingChange(true);
              }}
            >
              Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {isEditing && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto hidden h-8 lg:flex"
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
                {event.features
                  .filter(
                    (feature) =>
                      feature.result.type === "success" &&
                      features?.find((f) => f.id === feature.featureId)
                        ?.entityTypeId === entity.type &&
                      !feature.rule
                  )
                  .map((feature) => {
                    const entityType = features?.find(
                      (f) => f.id === feature.featureId
                    )?.entityTypeId;
                    if (!entityType) return null;

                    return (
                      <DropdownMenuCheckboxItem
                        key={feature.featureId}
                        className="capitalize"
                        checked={config.featureOrder[entityType]?.includes(
                          feature.featureId
                        )}
                        onCheckedChange={(value) =>
                          onConfigChange(
                            value
                              ? {
                                  ...config,
                                  featureOrder: {
                                    ...config.featureOrder,
                                    [entityType]: [
                                      ...(config.featureOrder[entityType] ??
                                        []),
                                      feature.featureId,
                                    ],
                                  },
                                }
                              : {
                                  ...config,
                                  featureOrder: {
                                    ...config.featureOrder,
                                    [entityType]:
                                      config.featureOrder[entityType]?.filter(
                                        (id) => id !== feature.featureId
                                      ) ?? [],
                                  },
                                }
                          )
                        }
                        onSelect={(event) => event.preventDefault()}
                      >
                        {feature.featureName}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* <Button
                    size="sm"
                    className="h-8"
                    onClick={() => onIsEditingChange(false)}
                  >
                    Done
                  </Button> */}
          </>
        )}
      </div>

      <SortableFeatureGrid
        features={event.features.filter(
          (feature) =>
            feature.result.type === "success" &&
            features?.find((f) => f.id === feature.featureId)?.entityTypeId ===
              entity.type
        )}
        entityNameMap={entityNameMap}
        onFeatureOrderChange={(order) => {
          onConfigChange({
            ...config,
            featureOrder: {
              ...config.featureOrder,
              [entity.type]: order,
            },
          });
        }}
        featureOrder={config.featureOrder[entity.type] ?? []}
        isEditing={isEditing}
      />
    </div>
  );
};

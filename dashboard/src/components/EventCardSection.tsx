import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { type Entity } from "event-processing";
import { GripVertical } from "lucide-react";
import { useCallback, useMemo } from "react";
import { type EventViewConfig } from "~/shared/validation";
import { api, type RouterOutputs } from "~/utils/api";
import { EntityChip } from "./EntityChip";
import { SortableFeatureGrid } from "./SortableFeatureGrid";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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
  entity?: Entity;
  entityNameMap: Record<string, string>;
  isEditing?: boolean;
  config: NonNullable<EventViewConfig["gridConfig"]>[string];
  onConfigChange: (
    newConfig: NonNullable<EventViewConfig["gridConfig"]>[string]
  ) => void;
  event: RouterOutputs["lists"]["getEventsList"]["rows"][number];
}) => {
  const { data: features } = api.features.list.useQuery();
  const { data: entityTypes } = api.entityTypes.list.useQuery();
  const entityTypeName = useMemo(
    () => entityTypes?.find((et) => et.id === entity?.type)?.type ?? "",
    [entity, entityTypes]
  );

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const key = useMemo(() => (entity ? entity.type : "event"), [entity]);

  const handleOrderChange = useCallback(
    (newOrder: string[]) => {
      onConfigChange({
        ...config,
        featureOrder: {
          ...config.featureOrder,
          [key]: newOrder,
        },
      });
    },
    [onConfigChange, config, key]
  );

  return (
    <div className="mb-8 bg-background" ref={setNodeRef} style={style}>
      <div className="flex items-center mb-2">
        {isEditing && (
          <GripVertical
            className="cursor-pointer w-4 h-4 mr-1 shrink-0"
            {...attributes}
            {...listeners}
          />
        )}

        {entity && (
          <EntityChip
            entityId={entity.id}
            entityType={entity.type}
            name={`${entityTypeName}: ${entityNameMap[entity.id] ?? entity.id}`}
            href={`/entity/${entityTypeName}/${entity.id}`}
          />
        )}

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
                      !feature.rule &&
                      (entity
                        ? features?.find((f) => f.id === feature.featureId)
                            ?.entityTypeId === entity.type
                        : features?.find((f) => f.id === feature.featureId)
                            ?.eventTypeId)
                  )
                  .map((feature) => (
                    <DropdownMenuCheckboxItem
                      key={feature.featureId}
                      className="capitalize"
                      checked={config.featureOrder[key]?.includes(
                        feature.featureId
                      )}
                      onCheckedChange={(value) =>
                        value
                          ? handleOrderChange([
                              ...(config.featureOrder[key] ?? []),
                              feature.featureId,
                            ])
                          : handleOrderChange(
                              config.featureOrder[key]?.filter(
                                (id) => id !== feature.featureId
                              ) ?? []
                            )
                      }
                      onSelect={(event) => event.preventDefault()}
                    >
                      {feature.featureName}
                    </DropdownMenuCheckboxItem>
                  ))}
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
            (entity
              ? features?.find((f) => f.id === feature.featureId)
                  ?.entityTypeId === entity.type
              : features?.find((f) => f.id === feature.featureId)?.eventTypeId)
        )}
        entityNameMap={entityNameMap}
        onFeatureOrderChange={handleOrderChange}
        featureOrder={config.featureOrder[key] ?? []}
        isEditing={isEditing}
      />
    </div>
  );
};

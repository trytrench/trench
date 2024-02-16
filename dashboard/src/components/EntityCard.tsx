import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import Link from "next/link";
import { useDecision } from "~/hooks/useDecision";
import { api, type RouterOutputs } from "~/utils/api";
import { customEncodeURIComponent } from "../lib/uri";
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

interface Props {
  entity: RouterOutputs["lists"]["getEntitiesList"]["rows"][number];
  entityNameMap: Record<string, string>;
  featureOrder: string[];
  onFeatureOrderChange: (newOrder: string[]) => void;
  isEditing?: boolean;
}

export const EntityCard = ({
  entity,
  entityNameMap,
  featureOrder,
  onFeatureOrderChange,
  isEditing = false,
}: Props) => {
  const decision = useDecision(entity.features);
  const { data: entityTypes } = api.entityTypes.list.useQuery();
  const entityTypeName = entityTypes?.find((et) => et.id === entity.entityType)
    ?.type;

  return (
    <div className="border rounded-lg shadow-sm p-8">
      <div className="flex items-center">
        <Link
          href={`/entity/${customEncodeURIComponent(
            entityTypeName
          )}/${customEncodeURIComponent(entity.entityId)}`}
        >
          <h1 className="text-lg text-emphasis-foreground">
            {entityTypeName}: {entity.entityName ?? entity.entityId}
          </h1>
        </Link>

        <div className="flex items-center ml-auto space-x-2">
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
                  {entity.features
                    .filter((feature) => !feature.rule)
                    .map((feature) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={feature.featureId}
                          className="capitalize"
                          checked={featureOrder.includes(feature.featureId)}
                          onCheckedChange={(value) =>
                            onFeatureOrderChange(
                              value
                                ? [...featureOrder, feature.featureId]
                                : featureOrder.filter(
                                    (id) => id !== feature.featureId
                                  )
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
            </>
          )}
        </div>

        {/* <div className="ml-3">
          {decision && <RenderDecision decision={decision} />}
        </div> */}
      </div>
      {/* {entity.firstSeenAt && (
          <div className="text-muted-foreground text-sm">
            First seen:{" "}
            {format(new Date(entity.firstSeenAt), "MMM d, yyyy h:mm a")}
          </div>
        )} */}
      {entity.lastSeenAt && (
        <div className="text-muted-foreground text-sm">
          Last seen: {format(new Date(entity.lastSeenAt), "MMM d, yyyy h:mm a")}
        </div>
      )}

      <div className="h-4"></div>

      <SortableFeatureGrid
        features={entity.features}
        entityNameMap={entityNameMap}
        featureOrder={featureOrder}
        onFeatureOrderChange={onFeatureOrderChange}
        isEditing={isEditing}
      />
    </div>
  );
};

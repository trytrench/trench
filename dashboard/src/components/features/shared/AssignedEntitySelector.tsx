import { Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../ui/command";
import { Button } from "../../ui/button";
import { api } from "../../../utils/api";
import { FeatureType } from "event-processing";
import { Label } from "../../ui/label";

export function AssignedEntitySelector(props: {
  entityFeatureIds: string[];
  onEntityFeatureIdsChange?: (entityFeatureIds: string[]) => void;
}) {
  const { data: allFeatureDefs } = api.featureDefs.allInfo.useQuery({
    featureType: FeatureType.EntityAppearance,
  });

  const { entityFeatureIds, onEntityFeatureIdsChange } = props;

  return (
    <div>
      <div className="flex mb-4 items-center gap-8">
        <Label className="text-emphasis-foreground text-md">
          Assigned Entities
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="xs" className="gap-2">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="p-0">
            <Command>
              <CommandInput placeholder="Search..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {allFeatureDefs
                    ?.filter((v) => !entityFeatureIds.includes(v.id))
                    .map((fd) => (
                      <CommandItem
                        key={fd.id}
                        value={fd.id}
                        onSelect={() => {
                          onEntityFeatureIdsChange?.([
                            ...entityFeatureIds,
                            fd.id,
                          ]);
                        }}
                        className="relative pl-8"
                      >
                        {fd.name}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex">
        {allFeatureDefs?.map((fd) => {
          const isSelected = entityFeatureIds.includes(fd.id);
          if (!isSelected) return null;
          return (
            <div className="flex items-center gap-1.5" key={fd.id}>
              <div className="w-4 h-4 bg-gray-300 rounded-full" />
              <span>{fd.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

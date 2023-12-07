import { Plus, X } from "lucide-react";
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
import { cn } from "~/lib/utils";

// TODO: replace with inferred type
type FeatureQueryInput = {
  featureType: FeatureType;
};

export function FeatureMultiSelect(props: {
  selfFeatureId?: string; // so that it doesn't show up in options
  featureIds: string[];
  onFeatureIdsChange?: (entityFeatureIds: string[]) => void;
  filter?: FeatureQueryInput;
  label: string;
  disabled?: boolean;
}) {
  const { featureIds, onFeatureIdsChange, filter, label } = props;
  const { selfFeatureId, disabled } = props;

  const { data: allFeatureDefs } = api.featureDefs.allInfo.useQuery(
    filter ?? {}
  );

  const featureOpts = allFeatureDefs?.filter(
    (v) => !featureIds.includes(v.id) && v.id !== selfFeatureId
  );

  return (
    <div>
      <div className="flex mb-3 items-center gap-8">
        <Label className="text-emphasis-foreground text-md">{label}</Label>
        {!disabled && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                size="xs"
                className="gap-2"
                disabled={!allFeatureDefs || disabled}
              >
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
                    {featureOpts?.map((fd) => (
                      <CommandItem
                        key={fd.id}
                        value={fd.id}
                        onSelect={() => {
                          onFeatureIdsChange?.([...featureIds, fd.id]);
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
        )}
      </div>
      <div className="flex flex-col gap-1 min-h-[2rem]">
        {featureIds.length === 0 ? (
          <div className="italic text-muted-foreground text-sm">
            None Selected
          </div>
        ) : (
          allFeatureDefs?.map((fd) => {
            const isSelected = featureIds.includes(fd.id);
            if (!isSelected) return null;
            return (
              <div className="flex gap-1.5 items-center" key={fd.id}>
                <span
                  className={cn("w-[20rem]", {
                    "text-muted-foreground": disabled,
                  })}
                >
                  {fd.name}
                </span>
                {!disabled && (
                  <X
                    onClick={() => {
                      onFeatureIdsChange?.(
                        featureIds.filter((v) => v !== fd.id)
                      );
                    }}
                    className="w-6 h-6 opacity-50 cursor-pointer hover:opacity-100"
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

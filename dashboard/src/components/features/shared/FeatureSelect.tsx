import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
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
import { DataType, FeatureType } from "event-processing";
import { Label } from "../../ui/label";
import { useState } from "react";

// TODO: replace with inferred type
type FeatureQueryInput = {
  featureType?: FeatureType;
  dataType?: DataType;
};

export function FeatureSelect(props: {
  selfFeatureId?: string; // so that it doesn't show up in options
  value: string | undefined;
  onChange?: (value: string | undefined) => void;
  filter?: FeatureQueryInput;
  label: string;
  disabled?: boolean;
  optional?: boolean;
}) {
  const { value, onChange, filter, label } = props;
  const { selfFeatureId, disabled, optional } = props;

  const [open, setOpen] = useState(false);

  const { data: allFeatureDefs } = api.nodeDefs.allInfo.useQuery(filter ?? {});

  const selectedFeatureName = allFeatureDefs?.find((fd) => fd.id === value)
    ?.name;

  return (
    <div className="flex flex-col">
      <Label className="text-emphasis-foreground text-md mb-1.5">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[20rem] justify-between"
            disabled={!allFeatureDefs || disabled}
          >
            {value ? selectedFeatureName : "None Selected"}
            <div className="flex ml-2 gap-2 items-center">
              {optional && value && (
                <X
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange?.(undefined);
                  }}
                  className="w-4 h-4"
                />
              )}
              <ChevronsUpDown className=" h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="p-0">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {allFeatureDefs
                  ?.filter((fd) => fd.id !== selfFeatureId)
                  .map((fd) => (
                    <CommandItem
                      key={fd.id}
                      value={fd.id}
                      onSelect={() => {
                        setOpen(false);
                        onChange?.(fd.id);
                      }}
                      className="relative pl-8"
                    >
                      {value === fd.id && (
                        <Check className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4" />
                      )}
                      {fd.name}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

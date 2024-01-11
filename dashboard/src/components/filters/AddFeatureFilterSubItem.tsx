import { TypeName, type FeatureDef } from "event-processing";
import {
  BoxIcon,
  BracesIcon,
  Hash,
  LucideIcon,
  ToggleLeft,
  TypeIcon,
} from "lucide-react";
import { Type } from "ts-morph";
import { ulid } from "ulid";
import { JsonFilterOp } from "../../shared/jsonFilter";
import { type EventFilters } from "../../shared/validation";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "../ui/dropdown-menu";

type FeatureFilter = NonNullable<NonNullable<EventFilters>["features"]>[number];

const DATA_TYPE_TO_ICON = {
  [TypeName.Float64]: Hash,
  [TypeName.Int64]: Hash,
  [TypeName.String]: TypeIcon,
  [TypeName.Boolean]: ToggleLeft,
  [TypeName.Entity]: BoxIcon,
  [TypeName.Object]: BracesIcon,
} satisfies Record<TypeName, LucideIcon>;

export function AddFeatureFilterSubItem(props: {
  featureDefs: FeatureDef[];
  onAdd: (value: FeatureFilter) => void;
}) {
  const { featureDefs, onAdd } = props;

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>Features</DropdownMenuSubTrigger>

      <DropdownMenuSubContent className="w-[16rem]">
        <Command>
          <CommandInput placeholder="Search Features..." />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {featureDefs.map((fDef) => {
                const DataTypeIcon = DATA_TYPE_TO_ICON[fDef.dataType];
                return (
                  <CommandItem
                    key={fDef.featureId}
                    value={fDef.featureId}
                    className="pl-8"
                    onSelect={() => {
                      onAdd({
                        featureId: fDef.featureId,
                        dataType: fDef.dataType,
                        featureName: fDef.featureName,
                        value: {},
                      });
                    }}
                  >
                    <DataTypeIcon className="w-4 h-4 absolute left-2 top-2" />
                    {fDef.featureName}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

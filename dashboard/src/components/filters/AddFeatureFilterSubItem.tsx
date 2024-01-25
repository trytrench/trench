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
import { FeatureDef, TypeName } from "event-processing";

type FeatureFilter = NonNullable<NonNullable<EventFilters>["features"]>[number];

const DATA_TYPE_TO_ICON = {
  [TypeName.Float64]: Hash,
  [TypeName.Int64]: Hash,
  [TypeName.String]: TypeIcon,
  [TypeName.Boolean]: ToggleLeft,
  [TypeName.Entity]: BoxIcon,
  [TypeName.Object]: BracesIcon,
  [TypeName.Array]: BracesIcon,
  [TypeName.Any]: TypeIcon,
  [TypeName.Location]: TypeIcon,
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
                const TypeIcon = DATA_TYPE_TO_ICON[fDef.schema.type];
                return (
                  <CommandItem
                    key={fDef.id}
                    value={fDef.id}
                    className="pl-8"
                    onSelect={() => {
                      onAdd({
                        featureId: fDef.id,
                        dataType: fDef.schema.type,
                        featureName: fDef.name,
                        value: {},
                      });
                    }}
                  >
                    <TypeIcon className="w-4 h-4 absolute left-2 top-2" />
                    {fDef.name}
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

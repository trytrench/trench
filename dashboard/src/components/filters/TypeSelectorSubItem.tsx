import { Check } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "../ui/dropdown-menu";
import { TypeChip } from "./Chips";

export function TypeSelectorSubItem(props: {
  types: string[];
  value: string | null;
  onChange: (type: string) => void;
}) {
  const { types, value, onChange } = props;

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>Type</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {types.map((type) => (
          <DropdownMenuItem
            key={type}
            onClick={() => {
              onChange(type);
            }}
            className="relative pl-8"
          >
            <TypeChip type={type} className="shadow-sm" />

            {value === type && (
              <Check className="absolute w-4 h-4 left-2 top-2" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

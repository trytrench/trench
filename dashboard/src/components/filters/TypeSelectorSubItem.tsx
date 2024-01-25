import { Check } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "../ui/dropdown-menu";
import { TypeChip } from "./Chips";

type Type = { id: string; name: string };
export function TypeSelectorSubItem(props: {
  types: Type[];
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
            key={type.id}
            onClick={() => {
              onChange(type.id);
            }}
            className="relative pl-8"
          >
            <TypeChip type={type.name} className="shadow-sm" />

            {value === type.id && (
              <Check className="absolute w-4 h-4 left-2 top-2" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

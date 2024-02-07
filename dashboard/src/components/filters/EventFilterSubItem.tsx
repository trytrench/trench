import { api } from "~/utils/api";
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

interface Props {
  onAdd: (value: string) => void;
}

export function AddEventFilterSubItem({ onAdd }: Props) {
  const { data: eventTypes } = api.eventTypes.list.useQuery();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>Seen In</DropdownMenuSubTrigger>

      <DropdownMenuSubContent className="w-[16rem]">
        <Command>
          <CommandInput placeholder="Search event types..." />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {eventTypes?.map((type) => (
                <CommandItem
                  key={type.id}
                  value={type.id}
                  onSelect={() => {
                    onAdd(type.id);
                  }}
                >
                  {type.id}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

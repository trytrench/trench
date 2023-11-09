import * as Popover from "@radix-ui/react-popover";
import clsx from "clsx";
import { debounce } from "lodash";
import { MoreHorizontalIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { PopoverContent } from "./ui/popover";

interface Props {
  active: boolean;
  onClick: () => void;
  name: string;
  onRename: (newName: string) => void;
  onDelete: () => void;
  hasError: boolean;
  hasUnsavedChanges: boolean;
}

export const FileListItem = ({
  active,
  onClick,
  name: initialName,
  onRename,
  onDelete,
  hasError,
  hasUnsavedChanges,
}: Props) => {
  const [name, setName] = useState(initialName);
  const [isEditing, setIsEditing] = useState(false);

  const debouncedSave = useCallback(debounce(onRename, 300), []);

  return (
    <Popover.Root open={isEditing} onOpenChange={setIsEditing}>
      <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setIsEditing(false);
          }}
        >
          <Input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              debouncedSave(event.target.value || "Untitled");
            }}
          />
        </form>
      </PopoverContent>

      <div className="flex items-center justify-between">
        <Popover.Anchor asChild>
          <div className="flex items-center space-x-2">
            <Button
              variant="link"
              onClick={onClick}
              className={clsx({ "font-semibold": active })}
            >
              {name || "Untitled"}
            </Button>
            {hasError ? (
              <div className="w-2 h-2 bg-red-500 opacity-70 rounded-full ml-2" />
            ) : (
              hasUnsavedChanges && (
                <div className="w-2 h-2 bg-yellow-500 opacity-70 rounded-full ml-2" />
              )
            )}
          </div>
        </Popover.Anchor>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontalIcon className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => setTimeout(() => setIsEditing(true), 200)}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Popover.Root>
  );
};

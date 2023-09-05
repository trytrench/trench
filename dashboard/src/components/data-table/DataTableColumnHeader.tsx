import {
  Box,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Icon,
} from "@chakra-ui/react";
import type { Column } from "@tanstack/react-table";
import { ChevronsUpDown, EyeOff, SortAsc, SortDesc } from "lucide-react";

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <Box className={className}>{title}</Box>;
  }

  return (
    <Menu>
      <MenuButton
        as={Button}
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        rightIcon={
          <Icon
            as={
              column.getIsSorted() === "desc"
                ? SortDesc
                : column.getIsSorted() === "asc"
                ? SortAsc
                : ChevronsUpDown
            }
          />
        }
      >
        {title}
      </MenuButton>
      <MenuList>
        <MenuItem onClick={() => column.toggleSorting(false)}>
          <SortAsc className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
          Asc
        </MenuItem>
        <MenuItem onClick={() => column.toggleSorting(true)}>
          <SortDesc className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
          Desc
        </MenuItem>
        <MenuDivider />
        <MenuItem onClick={() => column.toggleVisibility(false)}>
          <EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
          Hide
        </MenuItem>
      </MenuList>
    </Menu>
  );
}

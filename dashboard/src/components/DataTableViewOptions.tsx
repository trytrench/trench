import type { Table } from "@tanstack/react-table";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@chakra-ui/react";
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItemOption,
  MenuOptionGroup,
  MenuDivider,
} from "@chakra-ui/react";

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  return (
    <Menu>
      <MenuButton
        as={Button}
        size="sm"
        display={{ base: "none", lg: "flex" }}
        rightIcon={<SlidersHorizontal size="1em" />}
      >
        View
      </MenuButton>
      <MenuList minWidth="150px">
        {table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => (
            <MenuItemOption
              key={column.id}
              value={column.id}
              isChecked={column.getIsVisible()}
              onClick={() => column.toggleVisibility(!column.getIsVisible())}
            >
              {column.columnDef.header}
            </MenuItemOption>
          ))}
      </MenuList>
    </Menu>
  );
}

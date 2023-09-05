import {
  Box,
  Flex,
  Icon,
  IconButton,
  Input,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
  Spacer,
} from "@chakra-ui/react";
import { debounce } from "lodash";
import { MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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

  const debouncedSave = useCallback(debounce(onRename, 300), []);

  const ref = useRef(null);

  return (
    <Popover initialFocusRef={ref}>
      {({ onClose }) => (
        <PopoverAnchor>
          <Flex w="100%" align="center">
            <PopoverContent p={2}>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  onClose();
                }}
              >
                <Input
                  ref={ref}
                  size="sm"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    debouncedSave(event.target.value || "Untitled");
                  }}
                />
              </form>
            </PopoverContent>
            <Link
              fontSize="sm"
              fontWeight={active ? "bold" : "normal"}
              onClick={onClick}
              isTruncated
            >
              {name || "Untitled"}
            </Link>
            {hasError ? (
              <Box
                w="8px"
                h="8px"
                bg="red.500"
                opacity="70%"
                borderRadius="50%"
                ml="2"
              />
            ) : (
              hasUnsavedChanges && (
                <Box
                  w="8px"
                  h="8px"
                  bg="gray.500"
                  // opacity="70%"
                  borderRadius="50%"
                  ml="2"
                />
              )
            )}

            <Spacer />
            <Menu>
              <MenuButton
                as={IconButton}
                size="xs"
                variant="ghost"
                aria-label="Save"
                icon={<Icon as={MoreHorizontal} />}
              />
              <MenuList>
                <PopoverTrigger>
                  <MenuItem fontSize="sm">Rename</MenuItem>
                </PopoverTrigger>
                <MenuItem fontSize="sm" onClick={onDelete}>
                  Delete
                </MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </PopoverAnchor>
      )}
    </Popover>
  );
};

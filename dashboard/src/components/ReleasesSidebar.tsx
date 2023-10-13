import {
  Avatar,
  Box,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  type DrawerProps,
  Flex,
  HStack,
  Icon,
  IconButton,
  Text,
  VStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from "@chakra-ui/react";
import { type Release } from "@prisma/client";
import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";
import pluralize from "pluralize";

interface Props extends DrawerProps {
  releases: Release[];
  onPreviewRelease: (release: Release) => void;
}

export const ReleasesSidebar = ({
  releases,
  onPreviewRelease,
  ...props
}: Props) => {
  return (
    <Drawer placement="right" {...props}>
      <DrawerContent>
        <DrawerHeader>Releases</DrawerHeader>
        <DrawerCloseButton />
        <DrawerBody>
          <Text fontSize="xs" color="gray.500">
            {releases.length} {pluralize("release", releases.length)}
          </Text>
          <VStack spacing={2} align="stretch">
            {releases.map((release) => (
              <Box key={release.id}>
                <Flex justify="space-between" align="center">
                  <Text fontSize="sm">
                    v{release.version} {release.description}
                  </Text>

                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<Icon as={MoreHorizontal} fontSize="sm" />}
                      size="xs"
                      variant="unstyled"
                      aria-label="More"
                    >
                      Actions
                    </MenuButton>
                    <MenuList fontSize="sm">
                      <MenuItem onClick={() => onPreviewRelease(release)}>
                        Preview
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Flex>
                <HStack spacing={2} mt={1}>
                  <Avatar name="Bowen Xue" size="xs"></Avatar>
                  <Text fontSize="xs" color="gray.500">
                    Published on {format(release.createdAt, "MMM dd")}
                  </Text>
                </HStack>
              </Box>
            ))}
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

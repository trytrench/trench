import {
  Avatar,
  Box,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerProps,
  Flex,
  HStack,
  Icon,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FileSnapshot } from "@prisma/client";
import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";

interface Props extends DrawerProps {
  fileSnapshots: FileSnapshot[];
}

export const RuleEditorSidebar = ({ fileSnapshots, ...props }: Props) => {
  return (
    <Drawer placement="right" {...props}>
      <DrawerContent>
        <DrawerHeader>Releases</DrawerHeader>
        <DrawerCloseButton />
        <DrawerBody>
          <Text fontSize="xs" color="gray.500">
            {fileSnapshots.length} releases
          </Text>
          <VStack spacing={2} align="stretch">
            {fileSnapshots.map((fileSnapshot) => (
              <Box key={fileSnapshot.id}>
                <Flex justify="space-between" align="center">
                  <Text fontSize="sm">
                    v{fileSnapshot.version} {fileSnapshot.description}
                  </Text>

                  <IconButton
                    size="xs"
                    variant="unstyled"
                    aria-label="More"
                    icon={<Icon as={MoreHorizontal} fontSize="sm" />}
                  />
                </Flex>
                <HStack spacing={2} mt={1}>
                  <Avatar name="Bowen Xue" size="xs"></Avatar>
                  <Text fontSize="xs" color="gray.500">
                    Published on {format(fileSnapshot.createdAt, "MMM dd")}
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

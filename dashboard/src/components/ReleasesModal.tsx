import {
  Avatar,
  Box,
  Flex,
  HStack,
  Icon,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  type ModalProps,
  Text,
  VStack,
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from "@chakra-ui/react";
import { Dataset, type Release } from "@prisma/client";
import { Card, Divider } from "@tremor/react";
import { format } from "date-fns";
import { ChevronDownIcon, MoreHorizontal } from "lucide-react";
import pluralize from "pluralize";

interface Props {
  releases: Release & { datasets: Dataset[] }[];
  isOpen: boolean;
  onClose: () => void;
}

export const ReleasesModal = ({ releases, isOpen, onClose }: Props) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Text>Releases</Text>
          <Text fontSize="xs" color="gray.500" fontWeight="normal">
            {releases.length} {pluralize("release", releases.length)}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb="8">
          <VStack spacing={2} align="stretch" divider={<Divider />}>
            {releases.map((release) => (
              <div key={release.id}>
                <Flex justify="space-between" align="center">
                  <Text fontSize="lg" fontWeight="semibold">
                    v{release.version} {release.description}
                  </Text>

                  {/* <Menu>
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
                      <MenuItem>Preview</MenuItem>
                    </MenuList>
                  </Menu> */}
                </Flex>
                <HStack spacing={2} mt={1} mb="2">
                  <Avatar name="Bowen Xue" size="xs"></Avatar>
                  <Text fontSize="xs" color="gray.500">
                    Published on {format(release.createdAt, "MMM dd")}
                  </Text>
                </HStack>
                {release.datasets.length > 0 && (
                  <Text mb="2" fontSize="md" mt="4" fontWeight="semibold">
                    Datasets
                  </Text>
                )}
                {release.datasets.map((dataset) => (
                  <Card key={dataset.id} className="px-4 py-2">
                    <Box>
                      <Flex justify="space-between" align="center">
                        <Text fontSize="sm" fontWeight="semibold">
                          {dataset.description}
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
                            <MenuItem>Preview</MenuItem>
                          </MenuList>
                        </Menu>
                      </Flex>
                      <HStack spacing={2} mt={1}>
                        <Avatar name="Bowen Xue" size="xs"></Avatar>
                        <Text fontSize="xs" color="gray.500">
                          Created on {format(dataset.createdAt, "MMM dd")}
                        </Text>
                      </HStack>
                    </Box>
                  </Card>
                ))}
              </div>
            ))}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

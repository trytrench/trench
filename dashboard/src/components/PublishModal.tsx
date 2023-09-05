import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (version: string, description?: string) => void;
  initialVersion: string;
}

function updateSemver(version: string, type: "major" | "minor" | "patch") {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error("Invalid semver format");
  }

  const [major, minor, patch] = version.split(".").map((x) => parseInt(x, 10));

  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
  }
}

export const PublishModal = ({
  isOpen,
  onClose,
  onPublish,
  initialVersion,
}: Props) => {
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState<"major" | "minor" | "patch">("patch");

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Publish</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={2}>
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description"
              />
            </FormControl>
            <FormControl as="fieldset">
              <FormLabel as="legend">Version</FormLabel>
              <RadioGroup
                value={version}
                onChange={(value) => setVersion(value)}
              >
                <VStack spacing={2} alignItems="flex-start">
                  <Radio value="major">
                    Major ({updateSemver(initialVersion, "major")})
                  </Radio>
                  <Radio value="minor">
                    Minor ({updateSemver(initialVersion, "minor")})
                  </Radio>
                  <Radio value="patch">
                    Patch ({updateSemver(initialVersion, "patch")})
                  </Radio>
                </VStack>
              </RadioGroup>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            colorScheme="blue"
            mr={1}
            onClick={() => {
              onPublish(updateSemver(initialVersion, version), description);
              setVersion("patch");
              setDescription("");
            }}
            size="sm"
          >
            Publish
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

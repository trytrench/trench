import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/react";
import { useState } from "react";
import { DateRangePicker } from "./DateRangePicker";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dateRange: { from: Date; to: Date }) => void;
  isLoading?: boolean;
}

export default function BackfillModal({
  isOpen,
  onClose,
  onConfirm: onBackfill,
  isLoading,
}: Props) {
  const [dateRange, setDateRange] = useState<
    { from: Date; to: Date } | undefined
  >();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Test rules</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <DateRangePicker value={dateRange} onValueChange={setDateRange} />
        </ModalBody>

        <ModalFooter>
          <Button
            colorScheme="blue"
            mr={1}
            disabled={!dateRange}
            onClick={() => onBackfill(dateRange!)}
            size="sm"
          >
            Run test
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            isLoading={isLoading}
          >
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

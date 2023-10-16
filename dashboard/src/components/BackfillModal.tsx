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
import { DatePickerWithRange } from "./DatePickerWithRange";
import { DateRange } from "react-day-picker";

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
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Test rules</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <DatePickerWithRange
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          ;
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

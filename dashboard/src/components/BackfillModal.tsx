import { Button } from "~/components/ui/button";
import { useState } from "react";
import { DatePickerWithRange } from "./DatePickerWithRange";
import { DateRange } from "react-day-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { SpinnerButton } from "./ui/custom/spinner-button";

interface Props {
  isOpen: boolean;
  onOpenChange: (val: boolean) => void;
  onConfirm: (dateRange: { from: Date; to: Date }) => void;
  isLoading?: boolean;
}

export default function BackfillModal({
  isOpen,
  onOpenChange,
  onConfirm: onBackfill,
  isLoading,
}: Props) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Rules</DialogTitle>
          </DialogHeader>
          <DatePickerWithRange
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <DialogFooter>
            <Button
              disabled={!dateRange}
              onClick={() => onBackfill(dateRange!)}
            >
              Run test
            </Button>
            <SpinnerButton
              onClick={() => onOpenChange(false)}
              loading={isLoading}
            >
              Cancel
            </SpinnerButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* <Modal isOpen={isOpen} onClose={onClose}>
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
      </Modal> */}
    </>
  );
}

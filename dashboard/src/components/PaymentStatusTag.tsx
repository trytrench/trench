import { Tag, TagLabel, TagLeftIcon, type TagProps } from "@chakra-ui/react";
import { PaymentOutcomeStatus } from "@prisma/client";
import { Check, X } from "lucide-react";
import React from "react";

export const PAYMENT_STATUS_METADATA = {
  [PaymentOutcomeStatus.Failed]: {
    color: "red",
    label: "failed",
    icon: X,
  },
  [PaymentOutcomeStatus.Pending]: {
    color: "red",
    label: "incomplete",
    icon: X,
  },
  [PaymentOutcomeStatus.Succeeded]: {
    color: "green",
    label: "succeeded",
    icon: Check,
  },
};

interface Props extends TagProps {
  status: string;
}

// eslint-disable-next-line react/display-name
export const PaymentStatusTag = React.forwardRef(
  ({ status, ...props }: Props, ref) => {
    const { icon, color, label } =
      PAYMENT_STATUS_METADATA[status as keyof typeof PAYMENT_STATUS_METADATA] ||
      {};

    return (
      <Tag ref={ref} colorScheme={color} size="sm" px={1.5} {...props}>
        <TagLeftIcon as={icon} mr={0.5} />
        <TagLabel>{label}</TagLabel>
      </Tag>
    );
  }
);

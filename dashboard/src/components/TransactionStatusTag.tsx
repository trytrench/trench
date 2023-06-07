import { Tag, TagLabel, TagLeftIcon, TagProps } from "@chakra-ui/react";
import { Check, X } from "lucide-react";
import React from "react";

export const TRANSACTION_STATUS_DATA = {
  failed: {
    color: "red",
    label: "failed",
    icon: X,
  },
  incomplete: {
    color: "red",
    label: "incomplete",
    icon: X,
  },
  succeeded: {
    color: "green",
    label: "succeeded",
    icon: Check,
  },
};

interface Props extends TagProps {
  status: string;
}

// eslint-disable-next-line react/display-name
export const TransactionStatusTag = React.forwardRef(
  ({ status, ...props }: Props, ref) => {
    const { icon, color, label } =
      TRANSACTION_STATUS_DATA[status as keyof typeof TRANSACTION_STATUS_DATA] ||
      {};

    return (
      <Tag ref={ref} colorScheme={color} size="sm" px={1.5} {...props}>
        <TagLeftIcon as={icon} mr={0.5} />
        <TagLabel>{label}</TagLabel>
      </Tag>
    );
  }
);

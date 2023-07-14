import { Tag, TagLabel, TagLeftIcon, type TagProps } from "@chakra-ui/react";
import { KycAttemptStatus } from "@prisma/client";
import { Check, X } from "lucide-react";
import React from "react";

export const VERIFICATION_STATUS_MAP = {
  [KycAttemptStatus.FAILED]: {
    color: "red",
    label: "failed",
    icon: X,
  },
  [KycAttemptStatus.PENDING]: {
    color: "red",
    label: "incomplete",
    icon: X,
  },
  [KycAttemptStatus.SUCCEEDED]: {
    color: "green",
    label: "succeeded",
    icon: Check,
  },
};

interface Props extends TagProps {
  status: string;
}

// eslint-disable-next-line react/display-name
export const VerificationStatusTag = React.forwardRef(
  ({ status, ...props }: Props, ref) => {
    const { icon, color, label } =
      VERIFICATION_STATUS_MAP[status as keyof typeof VERIFICATION_STATUS_MAP] ||
      {};

    return (
      <Tag ref={ref} colorScheme={color} size="sm" px={1.5} {...props}>
        <TagLeftIcon as={icon} mr={0.5} />
        <TagLabel>{label}</TagLabel>
      </Tag>
    );
  }
);

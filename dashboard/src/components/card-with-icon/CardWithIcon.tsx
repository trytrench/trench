import { Flex, HStack, Icon, Text } from "@chakra-ui/react";
import {
  AmexIcon,
  ApplePayIcon,
  DinersIcon,
  DiscoverIcon,
  GooglePayIcon,
  JCBIcon,
  MastercardIcon,
  VisaIcon,
} from "./icons";

const MAP_BRAND_TO_ICON = {
  visa: VisaIcon,
  mastercard: MastercardIcon,
  amex: AmexIcon,
  discover: DiscoverIcon,
  jcb: JCBIcon,
  diners: DinersIcon,
};

const MAP_WALLET_TO_ICON = {
  apple_pay: ApplePayIcon,
  google_pay: GooglePayIcon,
};

interface Props {
  last4?: string | null;
  brand?: string | null;
  wallet?: string | null;
  bold?: boolean;
}

export const CardWithIcon = ({ brand, last4, wallet, bold }: Props) => {
  const BrandIcon =
    MAP_BRAND_TO_ICON[brand as keyof typeof MAP_BRAND_TO_ICON] ?? null;
  const WalletIcon =
    MAP_WALLET_TO_ICON[wallet as keyof typeof MAP_WALLET_TO_ICON] ?? null;

  return (
    <Flex align="center">
      {WalletIcon ? (
        <Flex
          w="20px"
          h="20px"
          justify="center"
          align="center"
          bgColor="gray.100"
          rounded="sm"
          mr={1}
        >
          <WalletIcon />
        </Flex>
      ) : null}
      {BrandIcon ? <Icon as={BrandIcon} rounded="md" /> : <Text>{brand}</Text>}
      <Text fontWeight="bold" fontSize="2xs" ml={3}>
        ••••
      </Text>
      <Text ml={1} fontWeight={bold ? "bold" : "normal"}>
        {last4}
      </Text>
    </Flex>
  );
};

import {
  Avatar,
  Box,
  Flex,
  type FlexProps,
  Icon,
  Text,
  HStack,
} from "@chakra-ui/react";
import Link from "next/link";
import { type IconType } from "react-icons";
import { type ReactNode } from "react";
import { RxListBullet, RxMagicWand, RxBookmark } from "react-icons/rx";

interface NavItemProps extends FlexProps {
  icon: IconType;
  children: ReactNode;
  href: string;
}
const NavItem = ({ icon, href, children, ...rest }: NavItemProps) => {
  return (
    <Link
      href={href}
      style={{ textDecoration: "none" }}
      // _focus={{ boxShadow: "none" }}
    >
      <Flex
        align="center"
        px={4}
        py={3}
        role="group"
        cursor="pointer"
        _hover={{
          bg: "gray.700",
          color: "white",
        }}
        fontWeight="medium"
        {...rest}
      >
        {icon && (
          <Icon
            mr={3}
            fontSize={20}
            _groupHover={{
              color: "white",
            }}
            as={icon}
          />
        )}
        {children}
      </Flex>
    </Link>
  );
};

export const Sidebar = () => {
  return (
    <Box as="nav" w={64} h="full" bg="gray.800" color="white" boxShadow="lg">
      <HStack px={4} py={4} gap={1}>
        <Avatar name="Paper" size="md" rounded="md" />
        <Text fontWeight="medium" fontSize="lg">
          Paper
        </Text>
        {/* <UserButton /> */}
      </HStack>

      <NavItem href="/views/transactions" icon={RxListBullet}>
        Views
      </NavItem>
      <NavItem href="/transforms" icon={RxMagicWand}>
        Transforms
      </NavItem>
      <NavItem href="/rules" icon={RxBookmark}>
        Rules
      </NavItem>
    </Box>
  );
};

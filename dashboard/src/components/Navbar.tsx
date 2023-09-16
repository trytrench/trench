import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  HStack,
  Link,
  Spacer,
  Text,
  VStack,
  useBreakpointValue,
  useDisclosure,
} from "@chakra-ui/react";
import { Menu } from "lucide-react";
import { signOut } from "next-auth/react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { useRef } from "react";

interface Props {
  href: string;
  children: React.ReactNode;
}

const NavItem = ({ href, children, ...props }: Props) => {
  const router = useRouter();
  const active = router.pathname.split("/")[1] === href.split("/")[1];

  return (
    <Link
      as={NextLink}
      href={href}
      color={active ? "black" : "gray.500"}
      textShadow={active ? "0 0 0.5px black" : "none"}
      // fontWeight="medium"
      _hover={{ color: "black" }}
      {...props}
    >
      {children}
    </Link>
  );
};

export const Navbar = () => {
  const isDesktop = useBreakpointValue({ base: false, lg: true });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef(null);

  return (
    <Flex
      width="100%"
      px={isDesktop ? 8 : 4}
      py={4}
      justify="start"
      align={"center"}
      borderBottom="2px"
      borderColor="gray.200"
      as="nav"
    >
      <Box display="flex" alignItems="center" gap={4}>
        {!isDesktop && (
          <Box as="button" m={-3} p={3} ref={btnRef} onClick={onOpen}>
            <Menu height={24} width={24} />
          </Box>
        )}
        <NextLink href="/">
          <Text fontSize="lg" fontWeight="bold" mr={12}>
            Trench
          </Text>
        </NextLink>
      </Box>
      {isDesktop ? (
        <Box flex={1} flexDirection="row" display="flex">
          <HStack spacing={6}>
            <NavItem href="/dashboard">Dashboard</NavItem>
            <NavItem href="/lists">Lists</NavItem>
            <NavItem href="/rules">Rules</NavItem>
          </HStack>
          <Box flex={1} />
          <HStack spacing={4} fontSize="sm">
            <NavItem href="/changelog">Changelog</NavItem>
            <NavItem href="/help">Help</NavItem>
            <NavItem href="/docs">Docs</NavItem>
            <Spacer />
            <Button
              size="sm"
              onClick={() => {
                signOut();
              }}
            >
              Sign out
            </Button>
            {/* <UserButton afterSignOutUrl="/" /> */}
          </HStack>
        </Box>
      ) : (
        <Flex justify="end" flex={1}>
          {/* <UserButton afterSignrOutUrl="/" /> */}
          <Button
            size="sm"
            onClick={() => {
              signOut();
            }}
          >
            Sign out
          </Button>
        </Flex>
      )}

      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Trench</DrawerHeader>

          <DrawerBody>
            <VStack align="start" onClick={onClose}>
              <NavItem href="/dashboard">Dashboard</NavItem>
              <NavItem href="/feed">Lists</NavItem>
              <NavItem href="/rules">Rules</NavItem>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Flex>
  );
};

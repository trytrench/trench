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
import { Select, SelectItem, Tab, TabGroup, TabList } from "@tremor/react";
import { Menu } from "lucide-react";
import { signOut } from "next-auth/react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { useRef } from "react";
import { api } from "../utils/api";
import { handleError } from "../lib/handleError";

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

const TABS = [
  { name: "Events", path: "events" },
  { name: "Finder", path: "find" },
  { name: "Rules", path: "rules" },
  { name: "Data Explorer", path: "dashboard" },
];

export const Navbar = () => {
  const isDesktop = useBreakpointValue({ base: false, lg: true });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef(null);

  const router = useRouter();

  const datasetId = router.query.datasetId as string | undefined;

  const { data: datasets } = api.datasets.list.useQuery();

  const pathEnd = router.pathname.split("/").pop();
  const selectedTabIndex = TABS.findIndex((tab) => tab.path === pathEnd);

  return (
    <Box
      width="100%"
      px={isDesktop ? 8 : 4}
      justify="start"
      align={"center"}
      borderBottom="2px"
      borderColor="gray.200"
      as="nav"
      shrink={0}
      flexShrink={0}
    >
      <Box
        display="flex"
        mt={2}
        alignItems="center"
        justifyItems="flex-start"
        gap={4}
      >
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
        <div>
          <Select
            value={datasetId}
            placeholder="Select dataset..."
            className="w-64"
            onValueChange={(value) => {
              router.push(`/datasets/${value}/events`).catch(handleError);
            }}
          >
            {datasets?.map((dataset) => {
              return (
                <SelectItem key={dataset.id} value={dataset.id}>
                  {dataset.name}
                </SelectItem>
              );
            }) ?? []}
          </Select>
        </div>
        <Box flex={1} />

        <HStack spacing={4} fontSize="sm">
          <NavItem href="/changelog">Changelog</NavItem>
          <NavItem href="/help">Help</NavItem>
          <NavItem href="/docs">Docs</NavItem>
          <Spacer />
          {/* <UserButton afterSignOutUrl="/" /> */}
        </HStack>
      </Box>
      {datasetId ? (
        <Box flex={1} flexDirection="row" display="flex">
          <TabGroup
            index={selectedTabIndex}
            onIndexChange={(index) => {
              const tab = TABS[index];
              router
                .push(`/datasets/${datasetId}/${tab?.path}`)
                .catch(handleError);
            }}
          >
            <TabList>
              {TABS.map((tab, idx) => {
                return (
                  <Tab key={idx} value={tab.path}>
                    {tab.name}
                  </Tab>
                );
              })}
            </TabList>
          </TabGroup>
        </Box>
      ) : null}

      {/* <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
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
      </Drawer> */}
    </Box>
  );
};

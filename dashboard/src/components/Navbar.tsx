import { Button } from "~/components/ui/button";
import { Menu, X } from "lucide-react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { useRef } from "react";
import { api } from "../utils/api";
import { handleError } from "../lib/handleError";
import clsx from "clsx";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/custom/light-tabs";

interface Props {
  href: string;
  children: React.ReactNode;
}

const NavItem = ({ href, children, ...props }: Props) => {
  const router = useRouter();
  const active = router.pathname.split("/")[1] === href.split("/")[1];

  return (
    <NextLink
      href={href}
      className={clsx({
        "text-gray-500 hover:text-black": !active,
        "text-black": active,
      })}
      {...props}
    >
      {children}
    </NextLink>
  );
};

const TABS = [
  { name: "Events", path: "events" },
  { name: "Finder", path: "find" },
  { name: "Info", path: "info" },
  { name: "Data Explorer", path: "dashboard" },
];

export const Navbar = () => {
  // const isDesktop = useBreakpointValue({ base: false, lg: true });
  const isDesktop = true;
  // const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef(null);

  const router = useRouter();

  const datasetId = router.query.datasetId as string | undefined;

  const isCreatePage = router.pathname === "/create";

  const { data: datasets } = api.datasets.list.useQuery();

  const pathEnd = router.pathname.split("/").pop();
  const selectedTabIndex = TABS.findIndex((tab) => tab.path === pathEnd);

  return (
    <nav
      className={clsx({
        "w-full self-center shrink-0 flex flex-col justify-start p-0": true,
      })}
    >
      <div className="flex mt-2 px-4 items-center justify-start gap-4">
        {!isDesktop && (
          // missing onclick
          <button className="-m-3 p-3" ref={btnRef}>
            <Menu height={24} width={24} />
          </button>
        )}
        <NextLink href="/">
          <h1 className="text-lg font-bold mr-12">Trench</h1>
        </NextLink>
        {isCreatePage ? (
          <>
            <div>Create new dataset</div>
          </>
        ) : (
          <>
            <div>
              <Select
                value={datasetId}
                onValueChange={(value) => {
                  router.push(`/datasets/${value}/events`).catch(handleError);
                }}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select dataset..." />
                </SelectTrigger>
                <SelectContent>
                  {datasets?.map((dataset) => {
                    return (
                      <SelectItem
                        key={dataset.id}
                        value={dataset.id.toString()}
                      >
                        {dataset.name}
                      </SelectItem>
                    );
                  }) ?? []}
                </SelectContent>
              </Select>
            </div>

            <a href="/create">
              <Button variant="ghost">Create</Button>
            </a>
            <a href={`/create?forkFrom=${datasetId}`}>
              <Button variant="ghost">Fork</Button>
            </a>
            <div className="grow" />

            <div className="flex gap-4 text-sm">
              <NavItem href="/changelog">Changelog</NavItem>
              <NavItem href="/help">Help</NavItem>
              <NavItem href="/docs">Docs</NavItem>
              <div className="grow" />
              {/* <UserButton afterSignOutUrl="/" /> */}
            </div>
          </>
        )}
      </div>
      {datasetId ? (
        <div className="">
          <Tabs
            value={`${selectedTabIndex}`}
            onValueChange={(index) => {
              const tab = TABS[parseInt(index)];
              router
                .push(`/datasets/${datasetId}/${tab?.path}`)
                .catch(handleError);
            }}
          >
            <TabsList className="pl-2">
              {TABS.map((tab, idx) => {
                return (
                  <TabsTrigger key={idx} value={`${idx}`}>
                    {tab.name}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      ) : null}

      {/* <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Trench</DrawerHeader>

          <DrawerBody>
            <VStack align="start" onClick={onClose}>
              <NavItem href="/events">Events</NavItem>
              <NavItem href="/find">Finder</NavItem>
              <NavItem href="/rules">Rules</NavItem>
              <NavItem href="/explore">Data Explorer</NavItem>
              <NavItem href="/settings">Settings</NavItem>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer> */}
    </nav>
  );
};

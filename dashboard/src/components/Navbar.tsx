import clsx from "clsx";
import { Menu } from "lucide-react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { useRef } from "react";
import { Button } from "~/components/ui/button";
import { handleError } from "../lib/handleError";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/custom/light-tabs";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "../utils/api";

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
  { name: "Rules", path: "rules" },
  { name: "Explore", path: "explore" },
];

export const Navbar = () => {
  // const isDesktop = useBreakpointValue({ base: false, lg: true });
  const isDesktop = true;
  const btnRef = useRef(null);

  const router = useRouter();
  const { data: projects } = api.project.list.useQuery();

  const projectName = router.query.projectName as string;

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
          <h1 className="text-lg font-bold text-black mr-12">Trench</h1>
        </NextLink>
        <div>
          <Select
            value={projectName}
            onValueChange={(value) => {
              router.push(`/${value}/events`).catch(handleError);
            }}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select project..." />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project) => {
                return (
                  <SelectItem key={project.name} value={project.name}>
                    {project.name}
                  </SelectItem>
                );
              }) ?? []}
            </SelectContent>
          </Select>
        </div>

        <div className="grow" />

        <div className="flex gap-4 text-sm">
          <NavItem href="/changelog">Changelog</NavItem>
          <NavItem href="/help">Help</NavItem>
          <NavItem href="/docs">Docs</NavItem>
          <div className="grow" />
          {/* <UserButton afterSignOutUrl="/" /> */}
        </div>
      </div>

      <div className="">
        <Tabs
          value={router.pathname.split("/").pop()}
          onValueChange={(tab) => {
            router.push(`/${projectName}/${tab}`).catch(handleError);
          }}
        >
          <TabsList className="pl-2">
            {TABS.map((tab) => {
              return (
                <TabsTrigger key={tab.path} value={tab.path}>
                  {tab.name}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

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

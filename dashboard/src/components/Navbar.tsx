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
import { ThemeToggle } from "./ui/custom/theme-toggle";

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
        transition: true,
        "text-muted-foreground hover:text-emphasis-foreground": !active,
        "text-emphasis-foreground": active,
      })}
      {...props}
    >
      {children}
    </NextLink>
  );
};

const RULES_TABS = [
  { name: "Editor", path: "" },
  { name: "Decisions", path: "decisions" },
];

const TABS = [
  { name: "Events", path: "events" },
  { name: "Finder", path: "find" },
  { name: "Rules", path: "rules", children: RULES_TABS },
  { name: "Explore", path: "explore" },
  { name: "Settings", path: "settings" },
];

export const Navbar = () => {
  // const isDesktop = useBreakpointValue({ base: false, lg: true });
  const isDesktop = true;
  const btnRef = useRef(null);

  const router = useRouter();
  const { data: projects } = api.project.list.useQuery();

  const project = router.query.project as string;

  const activeTab = router.pathname.split("/")[2];
  const activeTabChildren = TABS.find((tab) => tab.path === activeTab)
    ?.children;
  const activeChildTab = router.pathname.split("/")[3] ?? "";

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
          <h1 className="text-lg font-bold text-emphasis-foreground mr-12">
            Trench
          </h1>
        </NextLink>
        <div>
          <Select
            value={project}
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

        <ThemeToggle />

        <div className="flex gap-4 text-sm">
          <NavItem href="/changelog">Changelog</NavItem>
          <NavItem href="/help">Help</NavItem>
          <NavItem href="/docs">Docs</NavItem>
          <div className="grow" />
          {/* <UserButton afterSignOutUrl="/" /> */}
        </div>
      </div>

      <div>
        <Tabs
          value={activeTab}
          onValueChange={(tab) => {
            router.push(`/${project}/${tab}`).catch(handleError);
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

            {activeTabChildren && (
              <div className="flex animate-in fade-in-60">
                <div className="border-r my-2 mx-4 rotate-12" />
                <Tabs
                  value={activeChildTab}
                  onValueChange={(tab) => {
                    router
                      .push(`/${project}/${activeTab}/${tab}`)
                      .catch(handleError);
                  }}
                >
                  <TabsList>
                    {activeTabChildren.map((childTab) => {
                      return (
                        <TabsTrigger key={childTab.path} value={childTab.path}>
                          {childTab.name}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>
              </div>
            )}
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

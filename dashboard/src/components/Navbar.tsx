import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import clsx from "clsx";
import { Menu } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { useRef } from "react";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/custom/light-tabs";
import { handleError } from "../lib/handleError";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { ThemeToggle } from "./ui/custom/theme-toggle";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { getInitials } from "~/utils/getInitials";

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

const TABS = [
  { name: "Events", path: "events" },
  { name: "Finder", path: "find" },
  { name: "Code", path: "code" },
  { name: "Explore", path: "explore" },
  { name: "Settings", path: "settings" },
];

export const Navbar = () => {
  const session = useSession();

  // const isDesktop = useBreakpointValue({ base: false, lg: true });
  const isDesktop = true;
  const btnRef = useRef(null);

  const router = useRouter();

  const activeTab = router.pathname.split("/")[1];

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

        <div className="grow" />

        <div className="flex items-center gap-4 text-sm">
          <ThemeToggle />
          <NavItem href="/changelog">Changelog</NavItem>
          <NavItem href="/help">Help</NavItem>
          <NavItem href="/docs">Docs</NavItem>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Avatar className="w-9 h-9">
                {/* <AvatarImage src="https://github.com/shadcn.png" /> */}
                <AvatarFallback>
                  {getInitials(session.data?.user.name ?? "")}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>

            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => {
                  void signOut();
                  void router.push("/login");
                }}
              >
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div>
        <Tabs
          value={activeTab}
          onValueChange={(tab) => {
            router.push(`/${tab}`).catch(handleError);
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

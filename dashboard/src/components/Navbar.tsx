import { useState, useRef, HTMLProps, AnchorHTMLAttributes } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { ThemeToggle } from "./ui/custom/theme-toggle";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { getInitials } from "~/utils/getInitials";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetOverlay,
  SheetPortal,
} from "./ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const LINKS = {
  Docs: "https://trench.mintlify.app/quickstart",
};

// Helper component for navigation items
const NavItem = ({
  href,
  children,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
} & AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const router = useRouter();
  const isActive = router.pathname.split("/")[1] === href.split("/")[1];

  return (
    <NextLink
      href={href}
      passHref
      className={`transition text-sm ${
        isActive
          ? "text-emphasis-foreground"
          : "text-muted-foreground hover:text-emphasis-foreground"
      }`}
      {...rest}
    >
      <div>{children}</div>
    </NextLink>
  );
};

const TABS = [
  { name: "Finder", path: "/find" },
  { name: "Events", path: "/events" },
  { name: "Data Model", path: "/settings" },
];

export const Navbar = () => {
  const session = useSession();
  const { isMd } = useBreakpoint("md");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <nav className="block md:hidden border-b">
        <div className="flex justify-between items-center px-4 py-2">
          <div className="text-lg font-bold text-emphasis-foreground">
            Trench
          </div>
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <button
                className="p-2"
                aria-controls="mobile-nav"
                aria-expanded={mobileNavOpen}
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
              >
                <span className="sr-only">Menu</span>
                <svg
                  className="w-4 h-4 fill-current text-gray-900"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect y="4" width="24" height="2" />
                  <rect y="11" width="24" height="2" />
                  <rect y="18" width="24" height="2" />
                </svg>
              </button>
            </SheetTrigger>
            <SheetPortal>
              <SheetOverlay />
              <SheetContent side="right" className="min-w-80 bg-white p-4">
                <div className="h-12"></div>
                <div className="flex flex-col space-y-4">
                  {TABS.map((tab) => (
                    <NavItem
                      key={tab.path}
                      href={tab.path}
                      onClick={() => {
                        setMobileNavOpen(false);
                      }}
                    >
                      {tab.name}
                    </NavItem>
                  ))}
                  <div className="h-4"></div>
                  <NavItem href={LINKS.Docs}>Docs</NavItem>
                  <button
                    className="text-sm text-left"
                    onClick={() => signOut()}
                  >
                    Log Out
                  </button>
                </div>

                <div className="h-16"></div>
                <div className="flex items-center font-medium text-sm gap-4">
                  <div>Display:</div>

                  <ThemeToggle />
                </div>
              </SheetContent>
            </SheetPortal>
          </Sheet>
        </div>
      </nav>
      <nav className="hidden md:flex mt-2 px-4 items-center justify-between border-b pb-2 whitespace-nowrap">
        <div className="flex items-baseline gap-8">
          <NextLink href="/" passHref>
            <div className="text-lg font-bold text-emphasis-foreground mx-4">
              Trench
            </div>
          </NextLink>
          <div className="flex items-center gap-8">
            {TABS.map((tab) => (
              <NavItem key={tab.path} href={tab.path}>
                {tab.name}
              </NavItem>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <NavItem href={LINKS.Docs}>Docs</NavItem>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button>
                <Avatar className="w-9 h-9 text-sm">
                  <AvatarFallback>
                    {getInitials(session.data?.user?.name ?? "")}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onSelect={async () => {
                  void (await signOut());
                  void router.push("/login");
                }}
              >
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </>
  );
};

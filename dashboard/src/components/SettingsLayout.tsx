import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/router";
import { Navbar } from "./Navbar";
import { Toaster } from "./ui/toaster";
import { Button } from "./ui/button";

interface Props {
  children: React.ReactNode;
}
const items = [
  { title: "Features", path: "features" },
  { title: "Event types", path: "event-types" },
  { title: "Entity types", path: "entity-types" },
  { title: "Lists", path: "lists" },
];

export default function SettingsLayout({ children }: Props) {
  const router = useRouter();

  return (
    <div className="h-0 min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 overflow-auto">
        <div className="grow overflow-y-auto">
          <div className="container mx-auto">
            <div className="flex mt-12 gap-4">
              <div className="w-[16rem] flex flex-col">
                {items.map((item) => (
                  <Link
                    href={`/settings/${item.path}`}
                    key={item.title}
                    className={clsx(
                      "px-4 py-1 w-full text-sm text-muted-foreground text-left rounded-md transition flex justify-between items-center hover:bg-muted",
                      {
                        "bg-accent text-accent-foreground":
                          router.pathname
                            .split("settings/")[1]
                            ?.split("/")[0] === item.path,
                      }
                    )}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
              <div className="grow">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

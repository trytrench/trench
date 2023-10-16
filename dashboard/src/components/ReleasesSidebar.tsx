import { type Release } from "@prisma/client";
import { format } from "date-fns";
import { MoreHorizontalIcon } from "lucide-react";
import pluralize from "pluralize";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from "./ui/sheet";

interface Props {
  button: React.ReactNode;
  releases: Release[];
  onPreviewRelease: (release: Release) => void;
}

export const ReleasesSidebar = ({
  releases,
  onPreviewRelease,
  button,
}: Props) => {
  return (
    <Sheet>
      <SheetTrigger asChild>{button}</SheetTrigger>
      <SheetContent>
        <SheetHeader>Releases</SheetHeader>
        <div>
          <div>
            {releases.length} {pluralize("release", releases.length)}
          </div>
          <div>
            {releases.map((release) => (
              <div key={release.id}>
                <div className="flex justify-between items-center">
                  <div>
                    v{release.version} {release.description}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontalIcon className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => onPreviewRelease(release)}
                      >
                        Preview
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center space-x-2">
                  <Avatar>
                    <AvatarFallback>BX</AvatarFallback>
                  </Avatar>
                  <div>Published on {format(release.createdAt, "MMM dd")}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

import clsx from "clsx";
import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/router";
import { useState } from "react";
import { EditViewDialog } from "./EditViewDialog";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface Props {
  views: { name: string; id: string }[];
  children: React.ReactNode;
  filterComponent?: React.ReactNode;
  toggleComponent?: React.ReactNode;
  filtersComponent?: React.ReactNode;
  onSave: () => void;
  onCreate: (name: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  isEditing?: boolean;
  onIsEditingChange: (isEditing: boolean) => void;
}

export function ViewsLayout({
  views,
  children,
  filterComponent,
  toggleComponent,
  filtersComponent,
  onSave,
  onCreate,
  onRename,
  onDelete,
  isEditing,
  onIsEditingChange,
}: Props) {
  const router = useRouter();

  return (
    <div className="flex h-full">
      <div className="w-64 border-r shrink-0 space-y-1 pt-4 px-6">
        <div className="text-sm font-medium text-emphasis-foreground">
          Views
        </div>

        {views.map((view) => (
          <div
            key={view.id}
            onClick={() =>
              router.push({
                pathname: router.pathname,
                query: { ...router.query, view: view.id },
              })
            }
            className={clsx(
              "px-4 py-1 w-full text-sm text-muted-foreground text-left rounded-md transition flex justify-between items-center hover:bg-muted cursor-pointer",
              {
                "bg-accent text-accent-foreground":
                  router.query.view === view.id,
              }
            )}
          >
            {view.name}
          </div>
        ))}
      </div>

      <div className="flex-1 h-full">
        {isEditing ? (
          <div className="flex justify-end items-center py-3 px-8 border-b">
            <div className="space-x-2">
              <Button
                variant="outline"
                size="xs"
                onClick={() => onIsEditingChange(false)}
              >
                Cancel
              </Button>
              <Button size="xs" onClick={() => onIsEditingChange(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center py-3 px-8 border-b">
            <div className="text-emphasis-foreground text-sm">
              {views.find((v) => v.id === router.query.view)?.name}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="iconXs" variant="link" className="mr-4 shrink-0">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => onIsEditingChange(true)}>
                  Edit
                </DropdownMenuItem>

                <EditViewDialog
                  title="Rename view"
                  onSubmit={(values) => onRename(values.name)}
                >
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Rename
                  </DropdownMenuItem>
                </EditViewDialog>

                <DropdownMenuItem onSelect={onDelete}>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {filterComponent}

            <div className="flex items-center gap-2 ml-auto">
              {toggleComponent}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="xs" variant="outline">
                    Save
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={onSave}>
                    Save to this view
                  </DropdownMenuItem>

                  <EditViewDialog
                    title="Create new view"
                    onSubmit={(values) => onCreate(values.name)}
                  >
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      Create new view
                    </DropdownMenuItem>
                  </EditViewDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {filtersComponent && (
          <div className="border-b px-6 py-3 flex justify-between">
            {filtersComponent}
          </div>
        )}

        <div className="grow flex flex-col relative px-4 pt-2 h-full">
          {children}
        </div>
      </div>
    </div>
  );
}

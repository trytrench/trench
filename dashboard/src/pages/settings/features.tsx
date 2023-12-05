import { type ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Info, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { z } from "zod";
import SettingsLayout from "~/components/SettingsLayout";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { DataTable } from "~/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { api, type RouterOutputs } from "~/utils/api";
import { type NextPageWithLayout } from "../_app";

const Page: NextPageWithLayout = () => {
  const router = useRouter();

  const { data: featureDefs, refetch: refetchFeatureDefs } =
    api.featureDefs.list.useQuery();

  const { mutateAsync: deleteFeatureDef } =
    api.featureDefs.delete.useMutation();

  const columns: ColumnDef<RouterOutputs["featureDefs"]["list"][number]>[] =
    useMemo(
      () => [
        {
          id: "select",
          header: ({ table }) => (
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
              aria-label="Select all"
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          ),
          enableSorting: false,
          enableHiding: false,
        },
        {
          accessorKey: "featureName",
          header: "Name",
        },
        {
          id: "actions",
          cell: ({ row }) => {
            return (
              <>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>
                      {/* Created by {row.original.createdBy} on{" "} */}
                      {format(row.original.createdAt, "MMM d, yyyy")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 ml-2">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        router.push(
                          `/code/feature/edit/${row.original.featureId}`
                        );
                      }}
                    >
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        deleteFeatureDef({
                          id: row.original.featureId,
                        })
                          .then(() => {
                            return refetchFeatureDefs();
                          })
                          .catch((error) => {});
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            );
          },
        },
      ],
      []
    );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl text-emphasis-foreground">Features</h1>
      </div>
      <DataTable
        columns={columns}
        data={featureDefs ?? []}
        renderHeader={(table) => (
          <>
            <Input
              placeholder="Filter features..."
              value={
                (table.getColumn("featureName")?.getFilterValue() as string) ??
                ""
              }
              onChange={(event) =>
                table
                  .getColumn("featureName")
                  ?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
            <Button
              size="sm"
              className="ml-auto"
              onClick={() => {
                router.push("/code/feature/create");
              }}
            >
              Create
            </Button>
          </>
        )}
      />
    </div>
  );
};

Page.getLayout = (page) => <SettingsLayout>{page}</SettingsLayout>;

export default Page;

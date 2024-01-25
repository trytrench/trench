import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ChevronLeft, Info, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import SettingsLayout from "~/components/SettingsLayout";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { DataTable } from "~/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { NextPageWithLayout } from "~/pages/_app";
import { RouterOutputs, api } from "~/utils/api";

const formSchema = z.object({
  value: z.string(),
});

const Page: NextPageWithLayout = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { data: list, refetch: refetchList } = api.lists2.get.useQuery(
    { id: router.query.listId as string },
    { enabled: !!router.query.listId }
  );

  const { mutateAsync: addItem } = api.lists2.addItem.useMutation();
  const { mutateAsync: deleteItem } = api.lists2.deleteItem.useMutation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: "",
    },
  });

  const columns: ColumnDef<RouterOutputs["lists2"]["list"][number]>[] = useMemo(
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
            onClick={(event) => event.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "value",
        header: "Value",
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
                    Created by {row.original.createdBy} on{" "}
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
                      deleteItem({
                        id: row.original.id,
                      })
                        .then(() => {
                          return refetchList();
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

  function onSubmit(values: z.infer<typeof formSchema>) {
    addItem({
      value: values.value,
      listId: router.query.listId as string,
    })
      .then(() => {
        setOpen(false);
        form.reset();
        return refetchList();
      })
      .catch((error) => {});
  }

  return (
    <div>
      <Link
        href="/settings/lists"
        className="text-sm text-muted-foreground flex items-center gap-1"
      >
        <ChevronLeft className="w-3 h-3" />
        Back to lists
      </Link>
      <div className="flex items-center justify-between mt-1">
        <h1 className="text-2xl text-emphasis-foreground">{list?.name}</h1>
      </div>
      <DataTable
        columns={columns}
        data={list?.items ?? []}
        renderHeader={(table) => (
          <>
            <Input
              placeholder="Filter values..."
              value={
                (table.getColumn("value")?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table.getColumn("value")?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="ml-auto">
                  Create
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add item</DialogTitle>
                  {/* <DialogDescription>
                  Make changes to your profile here. Click save when you're
                  done.
                </DialogDescription> */}
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <FormField
                          control={form.control}
                          name="value"
                          render={({ field }) => (
                            <FormItem className="col-span-3">
                              <FormLabel>Value</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Save</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </>
        )}
      />
    </div>
  );
};

Page.getLayout = (page) => <SettingsLayout>{page}</SettingsLayout>;

export default Page;

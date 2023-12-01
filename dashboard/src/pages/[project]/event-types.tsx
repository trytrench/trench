import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Info, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import AppLayout from "~/components/AppLayout";
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
import { RouterOutputs, api } from "~/utils/api";
import { type NextPageWithLayout } from "../_app";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  alias: z.string().min(2, {
    message: "Alias must be at least 2 characters.",
  }),
});

const Page: NextPageWithLayout = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { data: project } = api.project.getByName.useQuery(
    { name: router.query.project as string },
    { enabled: !!router.query.project }
  );
  const datasetId = useMemo(
    () => project?.productionDatasetId?.toString(),
    [project]
  );

  const { data: eventTypes, refetch: refetchEventTypes } =
    api.eventTypes.list.useQuery(
      { projectId: project?.id },
      { enabled: !!project?.id }
    );

  const { mutateAsync: createEventType } = api.eventTypes.create.useMutation();
  const { mutateAsync: deleteEventType } = api.eventTypes.delete.useMutation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      alias: "",
    },
  });

  const columns: ColumnDef<RouterOutputs["eventTypes"]["list"][number]>[] =
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
          accessorKey: "type",
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
                        deleteEventType({
                          id: row.original.id,
                        })
                          .then(() => {
                            return refetchEventTypes();
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
    createEventType({
      projectId: project?.id,
      name: values.name,
    })
      .then(() => {
        setOpen(false);
        form.reset();
        return refetchEventTypes();
      })
      .catch((error) => {});
  }

  return (
    <div>
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl text-emphasis-foreground">Event Types</h1>
        </div>
        <DataTable
          columns={columns}
          data={eventTypes ?? []}
          renderHeader={(table) => (
            <>
              <Input
                placeholder="Filter event types..."
                value={
                  (table.getColumn("name")?.getFilterValue() as string) ?? ""
                }
                onChange={(event) =>
                  table.getColumn("name")?.setFilterValue(event.target.value)
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
                    <DialogTitle>Create event type</DialogTitle>
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
                            name="name"
                            render={({ field }) => (
                              <FormItem className="col-span-3">
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <FormField
                            control={form.control}
                            name="alias"
                            render={({ field }) => (
                              <FormItem className="col-span-3">
                                <FormLabel>Alias</FormLabel>
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
    </div>
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

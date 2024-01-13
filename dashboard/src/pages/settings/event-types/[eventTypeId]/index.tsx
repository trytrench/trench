import { zodResolver } from "@hookform/resolvers/zod";
import { NodeDefsMap, NodeType, TypeName } from "event-processing";
import {
  Check,
  ChevronLeft,
  ChevronsUpDown,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import SettingsLayout from "~/components/SettingsLayout";
import { SchemaDisplay } from "~/components/features/SchemaDisplay";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useToast } from "~/components/ui/use-toast";
import { type NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";
import AssignEntities from "../AssignEntities";
import EntityFeatureDialog from "../EntityFeatureDialog";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";

const entitySchema = z.object({
  entityTypeId: z.string(),
  path: z.string(),
});

const EntityDialog = ({
  title,
  children,
  onSubmit,
  path,
}: {
  title: string;
  children: React.ReactNode;
  onSubmit: (values: z.infer<typeof entitySchema>) => void;
  path: string;
}) => {
  const [open, setOpen] = useState(false);
  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const form = useForm<z.infer<typeof entitySchema>>({
    resolver: zodResolver(entitySchema),
    defaultValues: {
      entityTypeId: "",
      path,
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => {
              onSubmit(values);
              setOpen(false);
              form.reset();
            })}
          >
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <FormField
                  control={form.control}
                  name="entityTypeId"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormLabel>Entity</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an entity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {entityTypes?.map((entityType) => (
                            <SelectItem
                              key={entityType.id}
                              value={entityType.id}
                            >
                              {entityType.type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <FormField
                  control={form.control}
                  name="path"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormLabel>Path</FormLabel>
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
  );
};

const Page: NextPageWithLayout = () => {
  const router = useRouter();
  const { toast } = useToast();

  const { data: eventType } = api.eventTypes.get.useQuery(
    { id: router.query.eventTypeId as string },
    { enabled: !!router.query.eventTypeId }
  );

  const { data: nodes, refetch: refetchNodes } = api.nodeDefs.list.useQuery(
    { eventTypeId: router.query.eventTypeId as string },
    { enabled: !!router.query.eventTypeId }
  );

  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const { mutateAsync: createNodeDef } = api.nodeDefs.create.useMutation();

  const [open, setOpen] = useState(false);

  return (
    <div>
      <Link
        href="/settings/event-types"
        className="text-sm text-muted-foreground flex items-center gap-1"
      >
        <ChevronLeft className="w-3 h-3" />
        Back to event types
      </Link>
      <div className="mt-1 mb-4 flex items-center">
        <h1 className="text-2xl text-emphasis-foreground">{eventType?.type}</h1>
        <Select
          onValueChange={(value) =>
            void router.push(
              `/settings/event-types/${
                router.query.eventTypeId as string
              }/node/${value}`
            )
          }
        >
          <SelectTrigger className="w-[180px] ml-4">
            <SelectValue placeholder="Select a node" />
          </SelectTrigger>
          <SelectContent>
            {nodes
              ?.filter((node) => !node.config?.paths)
              .map((node) => (
                <SelectItem key={node.id} value={node.id}>
                  {node.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              role="combobox"
              className="ml-auto"
              aria-expanded={open}
            >
              Create node
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search types..." />
              <CommandEmpty>No framework found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  onSelect={() =>
                    void router.push(
                      `/settings/event-types/${
                        router.query.eventTypeId as string
                      }/node`
                    )
                  }
                >
                  Code
                </CommandItem>

                <CommandItem
                  onSelect={() =>
                    void router.push(
                      `/settings/event-types/${
                        router.query.eventTypeId as string
                      }/node?type=count`
                    )
                  }
                >
                  Count
                </CommandItem>

                <CommandItem
                  onSelect={() =>
                    void router.push(
                      `/settings/event-types/${
                        router.query.eventTypeId as string
                      }/node?type=unique-count`
                    )
                  }
                >
                  Unique Count
                </CommandItem>
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <Card className="h-96 overflow-auto p-6">
        <SchemaDisplay
          basePath="input.event.data"
          baseName="event.data"
          eventTypeId={router.query.eventTypeId as string}
          renderRightComponent={(path) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="iconXs" variant="link">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent>
                <EntityFeatureDialog title="Assign Entity Property" path={path}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Assign to entity
                  </DropdownMenuItem>
                </EntityFeatureDialog>

                <EntityDialog
                  path={path}
                  title="New Entity"
                  onSubmit={(values) => {
                    // Create entity appearance
                    createNodeDef({
                      eventTypes: [router.query.eventTypeId as string],
                      name:
                        entityTypes?.find(
                          (entityType) => entityType.id === values.entityTypeId
                        )?.type ?? "Entity",
                      type: NodeType.EntityAppearance,
                      returnSchema: {
                        type: TypeName.Entity,
                        entityType: values.entityTypeId,
                      } as NodeDefsMap[NodeType.EntityAppearance]["returnSchema"],
                      dependsOn: [],
                      config: {
                        entityType: values.entityTypeId,
                        valueAccessor: {
                          nodeId: null,
                          path: values.path.replace("input.event.data.", ""),
                        },
                      } as NodeDefsMap[NodeType.EntityAppearance]["config"],
                    })
                      .then(() => {
                        toast({
                          title: "Entity created",
                          // description: `${values.entity}`,
                        });
                        return refetchNodes();
                      })
                      .catch(() => {
                        toast({
                          variant: "destructive",
                          title: "Failed to create entity",
                        });
                      });
                  }}
                >
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    New entity
                  </DropdownMenuItem>
                </EntityDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          // onItemClick={(path: string, name: string) => {
          //   //  copy path to clipboard
          //   navigator.clipboard.writeText(path);
          //   toast({
          //     title: "Copied to clipboard!",
          //     description: path,
          //   });
          // }}
        />
      </Card>
      <div className="h-9" />
      <AssignEntities />
    </div>
  );
};

Page.getLayout = (page) => <SettingsLayout>{page}</SettingsLayout>;

export default Page;

import { zodResolver } from "@hookform/resolvers/zod";
import {
  FnDefsMap,
  FnType,
  TypeName,
  buildFnDef,
  buildNodeDefWithFn,
  dataPathZodSchema,
} from "event-processing";
import {
  Check,
  ChevronLeft,
  ChevronsUpDown,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import SettingsLayout from "~/components/SettingsLayout";
import { EventTypeNodesSchemaDisplay } from "~/components/features/SchemaDisplay";
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
import { RouterOutputs, api } from "~/utils/api";
import AssignEntities from "../../../../components/nodes/AssignEntities";

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
import { DataTable } from "~/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { AssignFeature } from "../../../../components/nodes/AssignFeatureDialog";
import { SelectDataPath } from "../../../../components/nodes/SelectDataPath";
import { handleError } from "../../../../lib/handleError";
import { useMutationToasts } from "../../../../components/nodes/editor/useMutationToasts";

const formSchema = z.object({
  entityTypeId: z.string(),
  path: dataPathZodSchema,
});

type FormType = z.infer<typeof formSchema>;

function EntityDialog(props: {
  title: string;
  children: React.ReactNode;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  defaults: Partial<FormType>;
  eventType: string;
}) {
  const { title, children, onSubmit, defaults, eventType } = props;

  const [open, setOpen] = useState(false);
  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entityTypeId: "",
      path: {
        nodeId: "",
        path: [],
      },
    },
  });

  const [initializedForm, setInitializedForm] = useState(false);
  useEffect(() => {
    if (!initializedForm && defaults) {
      form.reset(defaults);
      setInitializedForm(true);
    }
  }, [defaults, form, initializedForm]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
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
                        <SelectDataPath
                          eventType={eventType}
                          onChange={field.onChange}
                          value={field.value}
                        />
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
}

const Page: NextPageWithLayout = () => {
  const router = useRouter();
  const { toast } = useToast();

  const eventType = router.query.eventType as string;

  const { data: nodes, refetch: refetchFns } = api.nodeDefs.list.useQuery({
    eventType: eventType,
  });

  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const toasts = useMutationToasts();
  const { mutateAsync: createNodeWithFn } =
    api.nodeDefs.createWithFn.useMutation();

  const [open, setOpen] = useState(false);
  const [nodeSelectOpen, setFnSelectOpen] = useState(false);

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
        <h1 className="text-2xl text-emphasis-foreground">{eventType}</h1>

        <Popover open={nodeSelectOpen} onOpenChange={setFnSelectOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              role="combobox"
              variant="outline"
              aria-expanded={nodeSelectOpen}
              className="w-[200px] justify-between ml-4"
            >
              Select node
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search types..." />
              <CommandEmpty>No nodes found.</CommandEmpty>
              <CommandGroup>
                {nodes
                  ?.filter((node) =>
                    [
                      FnType.Computed,
                      FnType.Counter,
                      FnType.UniqueCounter,
                    ].includes(node.fn.type)
                  )
                  .map((node) => (
                    <CommandItem
                      key={node.id}
                      onSelect={() =>
                        void router.push(
                          `/settings/event-types/${
                            router.query.eventType as string
                          }/node/${node.id}`
                        )
                      }
                    >
                      {node.name}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

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
                {[
                  { name: "Computed", type: FnType.Computed },
                  { name: "Counter", type: FnType.Counter },
                  { name: "Unique Counter", type: FnType.UniqueCounter },
                  { name: "Decision", type: FnType.Decision },
                  { name: "Blocklist", type: FnType.Blocklist },
                ].map((node) => (
                  <CommandItem
                    key={node.type}
                    onSelect={() =>
                      void router.push(
                        `/settings/event-types/${
                          router.query.eventType as string
                        }/node?type=${node.type}`
                      )
                    }
                  >
                    {node.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <Card className="h-96 overflow-auto p-6">
        <EventTypeNodesSchemaDisplay
          eventType={eventType}
          renderRightComponent={(dataPath) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="iconXs" variant="link" className="h-3">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent>
                <AssignFeature
                  title="Assign Event Property"
                  defaults={{
                    dataPath: dataPath,
                    entityDataPath: undefined,
                    featureId: "",
                  }}
                >
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Assign to event
                  </DropdownMenuItem>
                </AssignFeature>

                <AssignFeature
                  title="Assign Entity Property"
                  defaults={{
                    dataPath: dataPath,
                    entityDataPath: undefined,
                    featureId: "",
                  }}
                >
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Assign to entity
                  </DropdownMenuItem>
                </AssignFeature>

                <EntityDialog
                  eventType={eventType}
                  defaults={{ path: dataPath }}
                  title="New Entity"
                  onSubmit={(values) => {
                    // Create entity appearance
                    const entityType = entityTypes?.find(
                      (entityType) => entityType.id === values.entityTypeId
                    );
                    if (!entityType) {
                      toast({
                        title: "Failed to create entity",
                        description: "Entity type not found",
                      });
                      return;
                    }
                    if (!eventType) {
                      toast({
                        title: "Failed to create entity",
                        description: "Event type not found",
                      });
                      return;
                    }

                    const nodeDefWithFn = buildNodeDefWithFn(
                      FnType.EntityAppearance,
                      {
                        name: entityType.type,
                        eventType,
                        inputs: {
                          dataPath: values.path,
                        },
                        fn: {
                          type: FnType.EntityAppearance,
                          returnSchema: {
                            type: TypeName.Entity,
                            entityType: values.entityTypeId,
                          },
                          config: {
                            entityType: values.entityTypeId,
                          },
                          name: entityType.type,
                        },
                      }
                    );

                    createNodeWithFn(nodeDefWithFn)
                      .then(async (res) => {
                        await refetchFns();
                        return res;
                      })
                      .then(toasts.createNode.onSuccess)
                      .catch(toasts.createNode.onError)
                      .catch(handleError);
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

      {/* <DataTable
        columns={columns}
        data={nodes?.filter((node) => node.type === FnType.Rule) ?? []}
      /> */}

      <div className="h-9" />
      <AssignEntities />
    </div>
  );
};

Page.getLayout = (page) => <SettingsLayout>{page}</SettingsLayout>;

export default Page;

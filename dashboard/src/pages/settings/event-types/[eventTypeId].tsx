import { zodResolver } from "@hookform/resolvers/zod";
import {
  DataType,
  NodeType,
  NODE_TYPE_DEFS,
  ComputedNodeType,
} from "event-processing";
import { ChevronLeft, ChevronsUpDown, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { string, z } from "zod";
import SettingsLayout from "~/components/SettingsLayout";
import { SchemaDisplay } from "~/components/features/SchemaDisplay";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
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
import { Separator } from "~/components/ui/separator";
import { useToast } from "~/components/ui/use-toast";
import { type NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";

const formSchema = z.object({
  entity: z.string(),
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
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  path: string;
}) => {
  const [open, setOpen] = useState(false);
  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entity: "",
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
                  name="entity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Entity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {entityTypes?.map((entityType) => (
                            <SelectItem
                              key={entityType.id}
                              value={entityType.type}
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

// Dialog with form component
const DialogWithForm = ({
  title,
  children,
  onSubmit,
  name: initialName,
  path,
}: {
  title: string;
  children: React.ReactNode;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  path: string;
  name?: string;
}) => {
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialName,
      //   entity: "",
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
                  name="entity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Entity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="m@example.com">
                            m@example.com
                          </SelectItem>
                          <SelectItem value="m@google.com">
                            m@google.com
                          </SelectItem>
                          <SelectItem value="m@support.com">
                            m@support.com
                          </SelectItem>
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

const FeatureCard = ({ name, path }: { name: string; path: string }) => {
  return (
    <Card className="px-4 flex justify-between items-center">
      <div className="flex gap-2">
        <div className="text-emphasis-foreground text-sm">Browser</div>
        <div className="text-sm">input.event.data.deviceId</div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="link">
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DialogWithForm
            name={name}
            path={path}
            title="Edit Feature"
            onSubmit={() => {}}
          >
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              Edit
            </DropdownMenuItem>
          </DialogWithForm>
          <DropdownMenuItem>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* <DialogWithForm
        title="Edit Feature"
        name={name}
        path={path}
        onSubmit={() => {}}
      >
        <Button variant="link" size="icon">
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DialogWithForm> */}
    </Card>
  );
};

const EntityCard = ({ name, path }: { name: string; path: string }) => {
  return (
    <Collapsible>
      <div className="flex justify-between items-center">
        <div>
          <div className="font-semibold text-emphasis-foreground">{name}</div>
          <div className="text-sm">{path}</div>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            <ChevronsUpDown className="h-4 w-4" />
            <span className="sr-only">Toggle</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <Separator className="my-2" />
      <CollapsibleContent className="space-y-2 mb-8">
        <FeatureCard name="Browser" path="input.event.data.deviceId" />
        <FeatureCard name="IP Data" path="input.event.data.ipData" />
      </CollapsibleContent>
    </Collapsible>
  );
};

const Page: NextPageWithLayout = () => {
  const router = useRouter();
  const { toast } = useToast();

  const { data: eventType } = api.eventTypes.get.useQuery(
    { id: router.query.eventTypeId as string },
    { enabled: !!router.query.eventTypeId }
  );

  const { mutateAsync: createNodeDef } = api.featureDefs.create.useMutation();
  const { data: nodes, refetch: refetchNodes } =
    api.featureDefs.getEventTypeNodes.useQuery(
      { eventTypeId: router.query.eventTypeId as string },
      { enabled: !!router.query.eventTypeId }
    );

  return (
    <div>
      <Link
        href="/settings/lists"
        className="text-sm text-muted-foreground flex items-center gap-1"
      >
        <ChevronLeft className="w-3 h-3" />
        Back to event types
      </Link>
      <div className="mt-1 mb-4">
        <h1 className="text-2xl text-emphasis-foreground">{eventType?.type}</h1>
      </div>
      <Card className="h-96 overflow-auto p-6">
        <SchemaDisplay
          basePath="input.event.data"
          baseName="event.data"
          eventTypes={new Set([router.query.eventTypeId as string])}
          renderRightComponent={(path) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="iconXs" variant="link">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent>
                <DialogWithForm
                  path={path}
                  title="New Feature"
                  onSubmit={() => {}}
                >
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    New Feature
                  </DropdownMenuItem>
                </DialogWithForm>

                <EntityDialog
                  path={path}
                  title="New Entity"
                  onSubmit={(values) => {
                    // Create entity appearance
                    createNodeDef({
                      eventTypes: [router.query.eventTypeId as string],
                      name: values.entity,
                      featureType: NodeType.Computed,
                      dataType: DataType.Entity,
                      deps: [],
                      config: {
                        type: ComputedNodeType.Path,
                        paths: {
                          [router.query.eventTypeId as string]: values.path,
                        },
                        compiledJs: "",
                        tsCode: "",
                        depsMap: {},
                      } as z.infer<
                        (typeof NODE_TYPE_DEFS)[NodeType.Computed]["configSchema"]
                      >,
                    })
                      .then(() => {
                        toast({
                          title: "FeatureDef created!",
                          description: `${values.name} ()`,
                        });
                        refetchNodes();
                      })
                      .catch(() => {
                        toast({
                          variant: "destructive",
                          title: "Failed to create FeatureDef",
                        });
                      });
                  }}
                >
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    New Entity
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
      <div className="space-y-4">
        {nodes
          ?.filter((node) => node.node.dataType === DataType.Entity)
          .map((node) => (
            <EntityCard
              name={node.node.name}
              path={node.config?.paths?.[router.query.eventTypeId as string]}
              key={node.id}
            />
          ))}
      </div>
    </div>
  );
};

Page.getLayout = (page) => <SettingsLayout>{page}</SettingsLayout>;

export default Page;

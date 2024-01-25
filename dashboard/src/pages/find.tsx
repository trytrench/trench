import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { TypeName } from "event-processing";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import AppLayout from "~/components/AppLayout";
import { EntityCard } from "~/components/EntityCard";
import { Button } from "~/components/ui/button";
import { SpinnerButton } from "~/components/ui/custom/spinner-button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useEntityNameMap } from "~/hooks/useEntityNameMap";
import type { NextPageWithLayout } from "~/pages/_app";
import { EntityFilters } from "~/shared/validation";
import { api } from "~/utils/api";
import { EditEntityFilters } from "../components/filters/EditEntityFilters";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
});

const EntityList = () => {
  const [filters, setFilters] = useState<EntityFilters>({});
  const { data: views, refetch: refetchViews } =
    api.entityViews.list.useQuery();

  const { mutateAsync: createView } = api.entityViews.create.useMutation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const limit = 10;

  const router = useRouter();

  useEffect(() => {
    const filters = views?.find((view) => view.id === router.query.view)
      ?.filters as EntityFilters;
    if (filters) setFilters(filters);
  }, [views, router.query.view]);

  const {
    data: entities,
    isLoading: entitiesLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = api.lists.getEntitiesList.useInfiniteQuery(
    {
      entityFilters: filters,
      // sortBy,
      // limit,
    },
    {
      getNextPageParam: (lastPage, pages) => {
        if (lastPage.rows.length < limit) return undefined;
        return pages.length * limit;
      },
    }
  );

  const allEntities = useMemo(() => {
    return entities?.pages.flatMap((page) => page.rows) ?? [];
  }, [entities]);

  const entityIds = useMemo<string[]>(() => {
    return allEntities.flatMap((entity) => {
      return (
        entity.features
          .filter(
            (feature) =>
              feature.result.type === "success" &&
              feature.result.data.schema.type === TypeName.Entity
          )
          .map((feature) => feature.result.data!.value.id) ?? []
      );
    });
  }, [allEntities]);
  const entityNameMap = useEntityNameMap(entityIds);

  const [open, setOpen] = useState(false);
  function onSubmit(values: z.infer<typeof formSchema>) {
    createView({ name: values.name, filters })
      .then(() => {
        setOpen(false);
        return refetchViews();
      })
      .catch((error) => {
        console.error(error);
      });
  }

  return (
    <div className="flex flex-col">
      <div className="flex p-3 px-8 border-b items-center">
        <EditEntityFilters value={filters} onChange={setFilters} />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="xs" variant="outline">
              Save
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create view</DialogTitle>
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
                </div>
                <DialogFooter>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex">
        <div className="w-64 border-r shrink-0 space-y-1 pt-4 px-6">
          <div className="text-sm font-medium text-emphasis-foreground">
            Views
          </div>
          {views?.map((view) => (
            <Link
              href={`?view=${view.id}`}
              key={view.id}
              className={clsx(
                "px-4 py-1 w-full text-sm text-muted-foreground text-left rounded-md transition flex justify-between items-center hover:bg-muted",
                {
                  "bg-accent text-accent-foreground":
                    router.query.view === view.id,
                }
              )}
            >
              {view.name}
            </Link>
          ))}
        </div>
        <div className="grow">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-4 px-8 py-4">
              {entitiesLoading ? (
                <Loader2Icon className="w-8 h-8 text-muted-foreground animate-spin self-center" />
              ) : (
                <>
                  {allEntities.map((entity) => {
                    return (
                      <EntityCard
                        key={`${entity.entityType}:${entity.entityId}`}
                        entity={entity}
                        entityNameMap={entityNameMap}
                      />
                    );
                  })}
                  {hasNextPage && (
                    <div className="self-center my-4">
                      <SpinnerButton
                        variant="outline"
                        onClick={() => {
                          fetchNextPage().catch((err) => {
                            console.error(err);
                          });
                        }}
                        loading={isFetchingNextPage}
                      >
                        Fetch more entities
                      </SpinnerButton>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          <div className="absolute bottom-0 left-0 h-8 w-full bg-gradient-to-t from-background pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
};

const Page: NextPageWithLayout = () => {
  const router = useRouter();

  return <EntityList />;
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

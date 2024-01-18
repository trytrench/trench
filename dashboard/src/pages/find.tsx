import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import AppLayout from "~/components/AppLayout";
import { EntityCard } from "~/components/EntityCard";
import { EntityFilter } from "~/components/ListFilter";
import { SpinnerButton } from "~/components/ui/custom/spinner-button";
import { ScrollArea } from "~/components/ui/scroll-area";
import type { NextPageWithLayout } from "~/pages/_app";
import { EntityFilters } from "~/shared/validation";
import { api } from "~/utils/api";
import { EditEntityFilters } from "../components/filters/EditEntityFilters";
import { TypeName } from "event-processing";
import { useEntityNameMap } from "~/hooks/useEntityNameMap";

const EntityList = () => {
  const [filters, setFilters] = useState<EntityFilters>({});

  const limit = 10;

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

  return (
    <div className="flex flex-col">
      <div className="flex p-3 px-8 border-b">
        <EditEntityFilters value={filters} onChange={setFilters} />
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
                      key={entity.entityId}
                      href={`/entity/${entity.id}`}
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
  );
};

const Page: NextPageWithLayout = () => {
  const router = useRouter();

  return <EntityList />;
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

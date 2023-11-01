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

const Page: NextPageWithLayout = () => {
  const router = useRouter();

  const { data: project } = api.project.getByName.useQuery(
    { name: router.query.project as string },
    { enabled: !!router.query.project }
  );
  const datasetId = useMemo(() => project?.productionDatasetId, [project]);

  const [filters, setFilters] = useState<EntityFilters>(undefined);

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
      limit,
      datasetId: datasetId ?? "",
    },
    {
      getNextPageParam: (lastPage, pages) => {
        if (lastPage.rows.length < limit) return undefined;
        return pages.length * limit;
      },
      enabled: !!datasetId,
    }
  );

  const allEntities = useMemo(() => {
    return entities?.pages.flatMap((page) => page.rows) ?? [];
  }, [entities]);

  return (
    <div className="flex flex-col overflow-hidden grow">
      <div className="flex p-3 px-8 border-b">
        <EntityFilter datasetId={datasetId!} onChange={setFilters} />
      </div>
      <div className="grow relative">
        <div className="absolute inset-0">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-4 px-8 py-4">
              {entitiesLoading ? (
                <Loader2Icon className="w-8 h-8 text-gray-300 animate-spin self-center" />
              ) : (
                <>
                  {allEntities.map((entity) => {
                    return (
                      <EntityCard
                        key={entity.id}
                        href={`/${project?.name}/entity/${entity.id}`}
                        entity={entity}
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
        </div>
        <div className="absolute bottom-0 left-0 h-8 w-full bg-gradient-to-t from-white pointer-events-none"></div>
      </div>
    </div>
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

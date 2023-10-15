import { Title } from "@tremor/react";
import { Navbar } from "~/components/Navbar";
import { api } from "~/utils/api";

import ListFilter from "~/components/ListFilter";
import { EntityCard } from "~/components/EntityCard";
import { Filter, useFilters } from "~/components/Filter";
import { useMemo } from "react";
import { useRouter } from "next/router";
import { Loader2Icon } from "lucide-react";
import { SpinnerButton } from "~/components/ui/custom/spinner-button";
import { ScrollArea } from "~/components/ui/scroll-area";

function EntitiesPage() {
  const router = useRouter();
  const datasetId = router.query.datasetId as string;

  const { type, labels, features, sortBy } = useFilters();

  const { data: entityTypes, isLoading: entityTypesLoading } =
    api.labels.getEntityTypes.useQuery({ datasetId }, { enabled: !!datasetId });

  const { data: entityLabels, isLoading: entityLabelsLoading } =
    api.labels.getEntityLabels.useQuery(
      {
        entityType: type,
        datasetId,
      },
      { enabled: !!datasetId }
    );

  const { data: entityFeatures, isLoading: entityFeaturesLoading } =
    api.labels.getEntityFeatures.useQuery(
      {
        entityType: type ?? undefined,
        datasetId,
      },
      { enabled: !!datasetId }
    );

  const { data: featureMetadata, isLoading: featureMetadataLoading } =
    api.features.getFeatureMetadata.useQuery();

  const featureToMetadata = useMemo(
    () =>
      featureMetadata?.reduce(
        (acc, curr) => {
          acc[curr.id] = curr;
          return acc;
        },
        {} as Record<string, any>
      ) ?? {},

    [featureMetadata]
  );

  const limit = 10;

  const {
    data: entities,
    isLoading: entitiesLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = api.lists.getEntitiesList.useInfiniteQuery(
    {
      entityFilters: {
        entityType: type ?? undefined,
        entityLabels: labels,
        entityFeatures: features,
      },
      sortBy,
      limit,
      datasetId,
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
        <ListFilter
          options={{
            types: entityTypes ?? [],
            labels: entityLabels ?? [],
            features:
              entityFeatures?.map((feature) => ({
                feature,
                dataType: featureToMetadata[feature]?.dataType ?? "text",
              })) ?? [],
          }}
          onChange={() => {}}
        />
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
                        datasetId={datasetId}
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
}

function Page() {
  return (
    <>
      <Navbar />
      <EntitiesPage />
    </>
  );
}

export default Page;

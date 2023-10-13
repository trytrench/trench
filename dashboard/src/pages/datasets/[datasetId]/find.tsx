import { Button, Title } from "@tremor/react";
import { Navbar } from "~/components/Navbar";
import { api } from "~/utils/api";

import { EntityCard } from "~/components/EntityCard";
import { Filter, useFilters } from "~/components/Filter";
import { useMemo } from "react";
import { useRouter } from "next/router";
import { Loader2Icon } from "lucide-react";

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
    <>
      <div className="flex-1 overflow-hidden flex items-stretch">
        <div className="w-96 shrink-0 flex flex-col items-start bg-tremor-background-muted p-8 border-r border-r-tremor-border">
          <Title>Entities</Title>
          {entityFeaturesLoading ||
          entityLabelsLoading ||
          entityTypesLoading ? (
            // supposed to be a Skeleton
            <></>
          ) : (
            <Filter
              types={entityTypes}
              labels={entityLabels}
              features={entityFeatures.map((feature) => ({
                feature,
                dataType: featureToMetadata[feature]?.dataType ?? "text",
              }))}
            />
          )}
        </div>
        <div className="relative flex-1">
          <div className="h-full flex flex-col gap-4 px-8 py-4 overflow-y-auto">
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
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => {
                        fetchNextPage().catch((err) => {
                          console.error(err);
                        });
                      }}
                      loading={isFetchingNextPage}
                    >
                      Fetch more entities
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="absolute bottom-0 left-0 h-8 w-full bg-gradient-to-t from-white pointer-events-none"></div>
        </div>
      </div>
    </>
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

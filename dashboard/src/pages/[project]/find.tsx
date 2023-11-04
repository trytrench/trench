import { EntityFeature, EntityType, Feature, Project } from "@prisma/client";
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

interface Props {
  project: Project;
  datasetId: string;
}

const EntityList = ({ project, datasetId }: Props) => {
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

  const { data: entityTypes } = api.labels.getEntityTypes.useQuery({
    projectId: project.id,
  });

  const { data: allFeatures } = api.labels.getFeatures.useQuery({
    projectId: project.id,
  });

  const { data: entityFeatures } = api.labels.getEntityFeatures.useQuery({
    projectId: project.id,
  });

  function getOrderedFeaturesForEntity(
    entity,
    entityTypes: EntityType[],
    entityFeatures: EntityFeature[],
    features: Feature[]
  ) {
    // Find the entity type for the current entity
    const entityType = entityTypes.find((et) => et.type === entity.type);

    // Build a map of feature overrides for this entity type
    const featureOverrides = entityFeatures
      .filter((ef) => ef.entityType.type === entity.type)
      .reduce((acc, ef) => {
        acc[ef.featureId] = ef.name;
        return acc;
      }, {});

    // Build a map of feature names for quick lookup
    const featureNameMap = features.reduce((acc, feature) => {
      acc[feature.id] = feature.feature;
      return acc;
    }, {});
    console.log(entity);

    // Get the features for the entity with overrides applied
    const orderedFeatures = entityType.featureOrder.map((featureId) => {
      return {
        id: featureId,
        name: featureOverrides[featureId] || featureNameMap[featureId],
        value: entity.features[featureNameMap[featureId]],
      };
    });

    return orderedFeatures;
  }

  const allEntities = useMemo(() => {
    return entities?.pages.flatMap((page) => page.rows) ?? [];
  }, [entities]);

  return (
    <div className="flex flex-col overflow-hidden grow">
      <div className="flex p-3 px-8 border-b">
        {/* <EntityFilter datasetId={datasetId!} onChange={setFilters} /> */}
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
                        href={`/${project.name}/entity/${entity.id}`}
                        entity={entity}
                        features={getOrderedFeaturesForEntity(
                          entity,
                          entityTypes,
                          entityFeatures,
                          allFeatures
                        )}
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

const Page: NextPageWithLayout = () => {
  const router = useRouter();

  const { data: project } = api.project.getByName.useQuery(
    { name: router.query.project as string },
    { enabled: !!router.query.project }
  );
  const datasetId = useMemo(
    () => project?.prodDatasetId?.toString(),
    [project]
  );

  if (!project || !datasetId) return null;

  return <EntityList datasetId={datasetId} project={project} />;
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

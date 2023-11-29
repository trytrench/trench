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

  const allEntities = useMemo(() => {
    return entities?.pages.flatMap((page) => page.rows) ?? [];
  }, [entities]);

  return (
    <div className="flex flex-col">
      <div className="flex p-3 px-8 border-b">
        <EntityFilter projectId={project.id} onChange={setFilters} />
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
                      key={entity.id}
                      href={`/${project.name}/entity/${entity.id}`}
                      entity={entity}
                      features={entity.features}
                      rules={entity.rules}
                      name={entity.name}
                      datasetId={datasetId}
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

  const { data: project } = api.project.getByName.useQuery(
    { name: router.query.project as string },
    { enabled: !!router.query.project }
  );
  const datasetId = useMemo(
    () => project?.productionDatasetId?.toString(),
    [project]
  );

  if (!project || !datasetId) return null;

  return <EntityList datasetId={datasetId} project={project} />;
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

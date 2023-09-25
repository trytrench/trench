import { Skeleton } from "@chakra-ui/react";
import { Title } from "@tremor/react";
import { Navbar } from "~/components/Navbar";
import { api } from "~/utils/api";

import { EntityCard } from "~/components/EntityCard";
import { Filter, useFilters } from "~/components/Filter";

function EntitiesPage() {
  const { type, labels, features, sortBy } = useFilters();

  const { data: entityTypes, isLoading: entityTypesLoading } =
    api.labels.getEntityTypes.useQuery();

  const { data: entityLabels, isLoading: entityLabelsLoading } =
    api.labels.getEntityLabels.useQuery({
      entityType: type,
    });

  const { data: entityFeatures, isLoading: entityFeaturesLoading } =
    api.labels.getEntityFeatures.useQuery({
      entityType: type,
    });

  const { data: entitiesList } = api.lists.getEntitiesList.useQuery({
    entityFilters: {
      entityType: type,
      entityLabels: labels,
      entityFeatures: features,
    },
    sortBy,
    limit: 100,
  });

  return (
    <>
      <div className="flex-1 overflow-hidden flex items-stretch">
        <div className="w-96 shrink-0 flex flex-col items-start bg-tremor-background-muted p-8 border-r border-r-tremor-border">
          <Title>Entities</Title>
          {entityFeaturesLoading ||
          entityLabelsLoading ||
          entityTypesLoading ? (
            <Skeleton />
          ) : (
            <Filter
              types={entityTypes}
              labels={entityLabels}
              features={entityFeatures}
            />
          )}
        </div>
        <div className="relative flex-1">
          <div className="h-full flex flex-wrap gap-4 p-8 overflow-y-auto">
            {entitiesList?.rows.map((entity) => {
              return <EntityCard key={entity.id} entity={entity} />;
            })}
          </div>
          <div className="absolute bottom-0 left-0 h-20 w-full bg-gradient-to-t from-white pointer-events-none"></div>
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

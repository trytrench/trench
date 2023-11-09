import { api } from "~/utils/api";
import Filter from "./Filter";
import { toEntityFilters, toEventFilters } from "./helpers";

interface Props {
  onChange: (value: any) => void; // shouldn't be any (TODO)
  projectId: string;
}

const EntityFilter = ({ projectId, onChange }: Props) => {
  const { data: entityTypes, isLoading: entityTypesLoading } =
    api.labels.getEntityTypes.useQuery({ projectId });

  const { data: entityFeatures, isLoading: entityFeaturesLoading } =
    api.labels.getEntityFeatures.useQuery({ projectId });

  return (
    <Filter
      options={{
        types: entityTypes?.map((type) => type.type) ?? [],
        labels: [],
        features: entityFeatures?.map((feature) => feature.feature) ?? [],
      }}
      onChange={(value) => {
        onChange(toEntityFilters(value));
      }}
    />
  );
};

const EventFilter = ({ projectId, onChange }: Props) => {
  const { data: eventTypes, isLoading: eventTypesLoading } =
    api.labels.getEventTypes.useQuery({ projectId });

  const { data: eventFeatures, isLoading: eventFeaturesLoading } =
    api.labels.getEventFeatures.useQuery({ projectId });

  return (
    <Filter
      options={{
        types: eventTypes?.map((type) => type.type) ?? [],
        labels: [],
        features: eventFeatures?.map((feature) => feature.feature) ?? [],
      }}
      onChange={(value) => {
        onChange(toEventFilters(value));
      }}
    />
  );
};

export { EntityFilter, EventFilter };

import { api } from "~/utils/api";
import Filter from "./Filter";
import { toEntityFilters, toEventFilters } from "./helpers";

interface EntityFilterProps {
  onChange: (value: any) => void; // shouldn't be any (TODO)
}

const EntityFilter = ({ onChange }: EntityFilterProps) => {
  const { data: entityTypes, isLoading: entityTypesLoading } =
    api.labels.getEntityTypes.useQuery({});

  const { data: entityFeatures, isLoading: entityFeaturesLoading } =
    api.labels.getEntityFeatures.useQuery({});

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

interface EventFilterProps {
  onChange: (value: any) => void; // shouldn't be any (TODO)
}

const EventFilter = ({ onChange }: EventFilterProps) => {
  const { data: eventTypes, isLoading: eventTypesLoading } =
    api.labels.getEventTypes.useQuery({});

  const { data: eventFeatures, isLoading: eventFeaturesLoading } =
    api.labels.getEventFeatures.useQuery({});

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

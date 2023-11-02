import { api } from "~/utils/api";
import Filter from "./Filter";
import { useMemo } from "react";
import { toEntityFilters, toEventFilters } from "./helpers";

interface Props {
  datasetId: string;
  onChange: (value: any) => void; // shouldn't be any (TODO)
}

const EntityFilter = ({ datasetId, onChange }: Props) => {
  const { data: entityTypes, isLoading: entityTypesLoading } =
    api.labels.getEntityTypes.useQuery(
      { datasetId: datasetId! },
      { enabled: !!datasetId }
    );

  const { data: entityLabels, isLoading: entityLabelsLoading } =
    api.labels.getEntityLabels.useQuery(
      { datasetId: datasetId! },
      { enabled: !!datasetId }
    );

  const { data: entityFeatures, isLoading: entityFeaturesLoading } =
    api.labels.getEntityFeatures.useQuery(
      { datasetId: datasetId! },
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

  return (
    <Filter
      options={{
        types: entityTypes ?? [],
        labels: entityLabels ?? [],
        features:
          entityFeatures?.map((feature) => ({
            feature,
            dataType: featureToMetadata[feature]?.dataType ?? "text",
          })) ?? [],
      }}
      onChange={(value) => {
        onChange(toEntityFilters(value));
      }}
    />
  );
};

const EventFilter = ({ datasetId, onChange }: Props) => {
  const { data: eventTypes, isLoading: eventTypesLoading } =
    api.labels.getEventTypes.useQuery(
      { datasetId: datasetId! },
      { enabled: !!datasetId }
    );

  const { data: eventLabels, isLoading: eventLabelsLoading } =
    api.labels.getEventLabels.useQuery(
      { datasetId: datasetId! },
      { enabled: !!datasetId }
    );

  const { data: eventFeatures, isLoading: eventFeaturesLoading } =
    api.labels.getEventFeatures.useQuery(
      { datasetId: datasetId! },
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

  return (
    <Filter
      options={{
        types: eventTypes ?? [],
        labels: eventLabels ?? [],
        features:
          eventFeatures?.map((feature) => ({
            feature,
            dataType: featureToMetadata[feature]?.dataType ?? "text",
          })) ?? [],
      }}
      onChange={(value) => {
        onChange(toEventFilters(value));
      }}
    />
  );
};

export { EntityFilter, EventFilter };
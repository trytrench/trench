import { TypeName } from "event-processing";
import { AnnotatedFeature } from "~/shared/types";
import { EntityChip } from "./EntityChip";
import { RenderResult } from "./RenderResult";

interface Props {
  features: AnnotatedFeature[];
  entityNameMap: Record<string, string>;
  cols?: number;
}

export const FeatureGrid = ({ features, entityNameMap, cols = 5 }: Props) => {
  const rulesToShow = features.filter(
    (feature) =>
      feature.rule &&
      feature.result.type === "success" &&
      feature.result.data.value
  );

  return features.length > 0 ? (
    <>
      {rulesToShow.length > 0 && (
        <div
          className={`grid grid-cols-${cols} gap-x-8 gap-y-2 text-sm text-foreground mb-4`}
        >
          {rulesToShow.map(({ featureId, featureName, rule }) => (
            <div key={featureId} className="flex space-x-1 items-center">
              <div className={`rounded-full ${rule!.color} w-2 h-2 shrink-0`} />
              <div className="font-semibold truncate">{featureName}</div>
            </div>
          ))}
        </div>
      )}

      <div
        className={`grid grid-cols-${cols} gap-x-8 gap-y-2 text-sm text-foreground`}
      >
        {features
          .filter((feature) => !feature.rule)
          .map(({ featureId, featureName, result }) => (
            <div key={featureId}>
              <div className="font-semibold truncate">{featureName}</div>
              {result.type === "success" &&
              result.data.schema.type === TypeName.Entity ? (
                <EntityChip
                  entityId={result.data.value.id}
                  entityType={result.data.value.type}
                  name={
                    entityNameMap[result.data.value.id] ?? result.data.value.id
                  }
                  href={`/entity/${result.data.value.type}/${result.data.value.id}`}
                />
              ) : (
                <RenderResult result={result} />
              )}
            </div>
          ))}
      </div>
    </>
  ) : (
    <div className="italic text-gray-400">No features</div>
  );
};

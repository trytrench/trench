// For the feature editor: name, type, and import alias.
// These properties are common to all feature types.

import { DataType, FeatureDefs, FeatureType } from "event-processing";
import { useMemo } from "react";
import { api } from "~/utils/api";
import { FeatureMultiSelect } from "../shared/FeatureMultiSelect";
import { TimeIntervalSelector } from "../shared/TimeIntervalSelector";
import { Select } from "~/components/ui/select";
import { FeatureSelect } from "../shared/FeatureSelect";

// - the monaco editor ig? unsure

type Config = FeatureDefs[FeatureType.Count]["config"];

interface EditCountProps {
  isEditingExistingFeature: boolean;
  featureDef: FeatureDefs[FeatureType.Count];
  onFeatureDefChange?: (featureDef: FeatureDefs[FeatureType.Count]) => void;
  onValidChange?: (valid: boolean) => void;
}

function EditCount(props: EditCountProps) {
  const { featureDef, onFeatureDefChange, onValidChange } = props;

  const { config } = featureDef;
  const { timeWindow, countByFeatureIds, conditionFeatureId } = config;

  function updateConfigAndDeps(val: Partial<Config>) {
    const newConfig = {
      ...config,
      ...val,
    };

    const newDeps = new Set<string>([...newConfig.countByFeatureIds]);
    if (newConfig.conditionFeatureId) {
      newDeps.add(newConfig.conditionFeatureId);
    }

    onFeatureDefChange?.({
      ...featureDef,
      config: newConfig,
      dependsOn: newDeps,
    });

    onValidChange?.(newConfig.countByFeatureIds.length > 0);
  }

  return (
    <div className="pb-40">
      <FeatureMultiSelect
        featureIds={countByFeatureIds}
        onFeatureIdsChange={(val) => {
          updateConfigAndDeps({ countByFeatureIds: val });
        }}
        label="Group By Features"
      />
      {/* todo: put an info question mark thingy */}

      <div className="mt-16"></div>

      <TimeIntervalSelector
        value={timeWindow}
        onChange={(val) => {
          updateConfigAndDeps({ timeWindow: val });
        }}
        label="Time Interval"
      />

      <div className="mt-16"></div>

      <FeatureSelect
        value={conditionFeatureId}
        onChange={(val) => {
          updateConfigAndDeps({ conditionFeatureId: val });
        }}
        filter={{
          dataType: DataType.Boolean,
        }}
        label="Condition Feature"
      />
    </div>
  );
}

export { EditCount };

//

const DataTypeToTsType: Record<DataType, string> = {
  [DataType.Boolean]: "boolean",
  [DataType.Int64]: "number",
  [DataType.Float64]: "number",
  [DataType.String]: "string",
  [DataType.Entity]: "string",
  [DataType.Object]: "any",
};

function usePrefix(props: {
  dataType: DataType;
  dependencies: Record<string, string>;
}) {
  const { dataType, dependencies } = props;
  const { data: allFeatureDefs } = api.featureDefs.allInfo.useQuery({});

  const depInterface = useMemo(() => {
    const lines = Object.entries(dependencies).map(([alias, featureId]) => {
      const feature = allFeatureDefs?.find((v) => v.id === featureId);
      if (!feature) return;
      return `  ${alias}: ${DataTypeToTsType[feature.dataType as DataType]};\n`;
    });

    return `interface Dependencies {\n${lines.join("")}}`;
  }, [dependencies, allFeatureDefs]);

  const inputInterface = `interface Input {\n  event: TrenchEvent;\n  deps: Dependencies;\n}`;
  const functionSignature = `async function getFeature(input: Input): Promise<${DataTypeToTsType[dataType]}> {`;

  return [depInterface, inputInterface, functionSignature].join("\n\n");
}

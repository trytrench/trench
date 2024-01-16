import { useAtom } from "jotai";
import { api } from "../../../utils/api";
import { useEntity } from "../context/EntityContext";
import { useComponentConfig } from "../useComponentConfig";
import { ComponentType } from "./_enum";
import { EntityPageComponent } from "./types";
import { isEditModeAtom } from "../state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../../ui/select";
import { RenderResult, RenderTypedData } from "../../RenderResult";
import { FeaturePathItem, FeatureSelector } from "../FeatureSelector";
import { useState } from "react";
import { TypeName } from "event-processing";

export interface FeatureConfig {
  featureId: string | null;
}

export const FeatureComponent: EntityPageComponent<FeatureConfig> = ({
  id,
}) => {
  const [config, setConfig] = useComponentConfig<ComponentType.Feature>(id);
  const [isEditMode] = useAtom(isEditModeAtom);
  // Component implementation
  const { entityType, entityId, features } = useEntity();

  const desiredFeature = features?.find(
    (feature) => feature.featureId === config.config.featureId
  );

  const [path, setPath] = useState<FeaturePathItem[]>([]);

  const { data } = api.features.getValue.useQuery(
    {
      entity: {
        id: entityId,
        type: entityType,
      },
      featurePath: path,
    },
    {
      enabled: !!entityId && !!entityType && !!path.length,
    }
  );
  return (
    <div>
      {isEditMode ? (
        <div>
          <FeatureSelector
            desiredSchema={{ type: TypeName.String }}
            baseEntityTypeId={entityType}
            value={path}
            onChange={setPath}
          />
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      ) : (
        <div className="flex items-baseline gap-2">
          <div className="text-gray-400">{desiredFeature?.featureName}</div>
          {desiredFeature && <RenderResult result={desiredFeature.result} />}
        </div>
      )}
    </div>
  );
};

// const NONE_STRING = "__NONE__";

// function FeatureSelector({
//   entityType,
//   value,
//   onChange,
// }: {
//   entityType: string;
//   value: string | null;
//   onChange: (value: string | null) => void;
// }) {
//   const { data: features } = api.features.list.useQuery({
//     entityTypeId: entityType,
//   });

//   const selectedFeature = features?.find((feature) => feature.id === value);

//   return (
//     <div>
//       <Select
//         value={value ?? NONE_STRING}
//         onValueChange={(val) => {
//           if (val === NONE_STRING) {
//             onChange(null);
//           } else {
//             onChange(val);
//           }
//         }}
//       >
//         <SelectTrigger>{selectedFeature?.name ?? "None"}</SelectTrigger>
//         <SelectContent>
//           <SelectItem value={NONE_STRING}>None</SelectItem>

//           {features?.map((feature) => (
//             <SelectItem key={feature.id} value={feature.id}>
//               {feature.name}
//             </SelectItem>
//           ))}
//         </SelectContent>
//       </Select>
//     </div>
//   );
// }

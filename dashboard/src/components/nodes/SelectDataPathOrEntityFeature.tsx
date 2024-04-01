import {
  type DataPath,
  DataPathUtils,
  FnType,
  type TSchema,
  TypeName,
  createDataType,
  hasFnType,
} from "event-processing";
import { api } from "../../utils/api";
import { useMemo } from "react";
import { ComboboxSelector } from "../ComboboxSelector";
import { SelectDataPath } from "./SelectDataPath";
import { useToast } from "../ui/use-toast";
import { useEditorStore, selectors } from "./editor/state/zustand";
import { generateNanoId } from "../../../../packages/common/src";

/**
 * This component is used to select a data path or entity feature path.
 *
 * The <SelectDataPath/> component holds the value of the selected data path, UNLESS
 * [value.nodeId] refers to a GetEntityFeature node. In this case, the component holds the value
 * of the node's entityDataPath config property.
 */

interface SelectDataPathProps {
  eventType: string;
  value: DataPath | null;

  onChange: (value: DataPath | null) => void;
  onIsValidChange?: (isValid: boolean) => void;

  desiredSchema?: TSchema;
  disablePathSelection?: boolean;
}

export function SelectDataPathOrEntityFeature(props: SelectDataPathProps) {
  const {
    eventType,
    value,
    onChange,
    desiredSchema,
    disablePathSelection = false,
  } = props;

  const nodes = useEditorStore(selectors.getNodeDefs({ eventType }));
  const getDataPathInfo = useEditorStore.use.getDataPathInfo();

  const valueNode = useMemo(() => {
    return nodes?.find((n) => n.id === value?.nodeId);
  }, [nodes, value]);

  const dataPathSelectorValue: DataPath | null = useMemo(() => {
    if (!valueNode) return null;

    if (hasFnType(valueNode, FnType.GetEntityFeature)) {
      return valueNode.inputs.entityDataPath ?? null;
    } else {
      return value;
    }
  }, [value, valueNode]);
  const dpSelectorSchema = dataPathSelectorValue
    ? getDataPathInfo(dataPathSelectorValue).schema
    : null;

  return (
    <div className="flex">
      <SelectDataPath
        eventType={eventType}
        value={dataPathSelectorValue}
        onChange={onChange}
        disablePathSelection={disablePathSelection}
        desiredSchema={{
          type: TypeName.Union,
          unionTypes: [
            desiredSchema ?? { type: TypeName.Any },
            { type: TypeName.Entity },
          ],
        }}
      />
      {dpSelectorSchema?.type === TypeName.Entity && (
        <SelectEntityFeatureNodeDataPath
          eventType={eventType}
          value={value}
          onChange={onChange}
          desiredSchema={desiredSchema}
        />
      )}
    </div>
  );
}

function SelectEntityFeatureNodeDataPath(props: {
  eventType: string;
  value: DataPath | null;
  onChange: (value: DataPath | null) => void;
  desiredSchema?: TSchema;
}) {
  const { eventType, value, onChange, desiredSchema } = props;

  const { toast } = useToast();
  const nodes = useEditorStore(selectors.getNodeDefs({ eventType }));
  const getDatapathInfo = useEditorStore.use.getDataPathInfo();
  const createNodeWithFn = useEditorStore.use.setNodeDefWithFn();

  const valueNode = useMemo(() => {
    const node = nodes?.find((n) => n.id === value?.nodeId);
    return node;
  }, [nodes, value]);

  const selectedEntityDataPath = useMemo(() => {
    if (!valueNode) return null;

    if (hasFnType(valueNode, FnType.GetEntityFeature)) {
      return valueNode.inputs.entityDataPath;
    } else if (valueNode.fn.returnSchema.type === TypeName.Entity) {
      return value;
    } else {
      return null;
    }
  }, [value, valueNode]);

  const selectedFeatureId =
    valueNode && hasFnType(valueNode, FnType.GetEntityFeature)
      ? valueNode.fn.config.featureId ?? null
      : null;

  const selectedDpSchema = selectedEntityDataPath
    ? getDatapathInfo(selectedEntityDataPath).schema
    : null;

  const { data: features } = api.features.list.useQuery({
    entityTypeId:
      selectedDpSchema?.type === TypeName.Entity
        ? selectedDpSchema.entityType
        : undefined,
  });

  const desiredType = createDataType(desiredSchema ?? { type: TypeName.Any });
  const featureOptions =
    features
      ?.filter((f) => {
        return desiredType.isSuperTypeOf(f.schema);
      })
      .map((f) => ({
        label: f.name,
        value: f.id,
      })) ?? [];

  return (
    <ComboboxSelector
      value={selectedFeatureId}
      onSelect={(newFeatureId) => {
        const feature = features?.find((f) => f.id === newFeatureId);
        if (!feature || !selectedEntityDataPath || !newFeatureId) {
          toast({
            title: "Error",
            description: "Something not found",
          });
          return;
        }

        const foundNode = nodes?.find((nodeDef) => {
          return (
            hasFnType(nodeDef, FnType.GetEntityFeature) &&
            DataPathUtils.equals(
              nodeDef.inputs.entityDataPath,
              selectedEntityDataPath
            ) &&
            nodeDef.fn.config.featureId === newFeatureId
          );
        });

        if (foundNode) {
          onChange({
            nodeId: foundNode.id,
            path: [],
          });
        } else {
          createNodeWithFn(FnType.GetEntityFeature, {
            id: generateNanoId(),
            eventType: eventType,
            name: `Get Feature: ${feature.name}`,
            inputs: {
              entityDataPath: selectedEntityDataPath,
            },
            fn: {
              id: generateNanoId(),
              name: `Get Feature: ${feature.name}`,
              type: FnType.GetEntityFeature,
              config: {
                featureId: newFeatureId,
                featureSchema: feature.schema,
              },
              returnSchema: feature.schema,
            },
          })
            .then((newDef) => {
              onChange({
                nodeId: newDef.id,
                path: [],
              });
            })
            .catch((err) => {
              toast({
                title: "Error",
                description: err.message,
              });
            });
        }
      }}
      options={featureOptions}
      placeholder="Select feature..."
    />
  );
}

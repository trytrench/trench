import {
  DataPath,
  DataPathUtils,
  FnType,
  TSchema,
  TypeName,
  buildNodeDefWithFn,
  createDataType,
  hasFnType,
} from "event-processing";
import { api } from "../../utils/api";
import { useMemo } from "react";
import { ComboboxSelector } from "../ComboboxSelector";
import { SelectDataPath } from "./SelectDataPath";
import { useToast } from "../ui/use-toast";

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

  const { data: nodes } = api.nodeDefs.list.useQuery({
    eventType,
  });

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

  return (
    <div className="flex">
      <SelectDataPath
        eventType={eventType}
        value={dataPathSelectorValue}
        onChange={onChange}
        disablePathSelection={disablePathSelection}
        desiredSchema={desiredSchema}
        // filterNodeOptions={(nodeDef) => {
        //   return (
        //     nodeDef.type !== FnType.GetEntityFeature &&
        //     nodeDef.type !== FnType.LogEntityFeature
        //   );
        // }}
      />
      {dataPathSelectorValue?.schema.type === TypeName.Entity && (
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

  const { data: nodes, refetch } = api.nodeDefs.list.useQuery({ eventType });

  const { mutateAsync: createNodeWithFn, isLoading: isLoadingCreate } =
    api.nodeDefs.createWithFn.useMutation({
      async onSuccess() {
        await refetch();
      },
    });

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

  const { data: features } = api.features.list.useQuery({
    entityTypeId:
      selectedEntityDataPath?.schema.type === TypeName.Entity
        ? selectedEntityDataPath.schema.entityType
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
      renderTrigger={({ renderOriginal, originalChildren }) => {
        return renderOriginal(
          isLoadingCreate ? "Loading..." : originalChildren
        );
      }}
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
            schema: foundNode.fn.returnSchema,
          });
        } else {
          const newNode = buildNodeDefWithFn(FnType.GetEntityFeature, {
            fn: {
              name: `Get Feature: ${feature.name}`,
              type: FnType.GetEntityFeature,
              config: {
                featureId: newFeatureId,
                featureSchema: feature.schema,
              },
              returnSchema: feature.schema,
            },
            eventType: eventType,
            name: `Get Feature: ${feature.name}`,
            inputs: {
              entityDataPath: selectedEntityDataPath,
            },
          });

          createNodeWithFn(newNode)
            .then((newDef) => {
              onChange({
                nodeId: newDef.id,
                path: [],
                schema: newDef.fn.returnSchema,
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

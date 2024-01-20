import {
  DataPath,
  DataPathUtils,
  NodeType,
  TSchema,
  TypeName,
  buildNodeDef,
  createDataType,
} from "event-processing";
import { api } from "../../utils/api";
import { useCallback, useMemo } from "react";
import { ComboboxSelector } from "../ComboboxSelector";
import { Badge } from "../ui/badge";
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
    disablePathSelection = true,
  } = props;

  const { data: nodes } = api.nodeDefs.list.useQuery({
    eventType,
  });

  const valueNode = useMemo(() => {
    return nodes?.find((n) => n.id === value?.nodeId);
  }, [nodes, value]);

  const dataPathSelectorValue: DataPath | null = useMemo(() => {
    if (!valueNode) return null;

    if (valueNode.type === NodeType.GetEntityFeature) {
      return valueNode.config.entityDataPath ?? null;
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
        // filterNodeOptions={(nodeDef) => {
        //   return (
        //     nodeDef.type !== NodeType.GetEntityFeature &&
        //     nodeDef.type !== NodeType.LogEntityFeature
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

  const { mutateAsync: createNodeDef, isLoading: isLoadingCreate } =
    api.nodeDefs.create.useMutation({
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

    if (valueNode.type === NodeType.GetEntityFeature) {
      return valueNode.config.entityDataPath;
    } else if (valueNode.returnSchema.type === TypeName.Entity) {
      return value;
    } else {
      return null;
    }
  }, [value, valueNode]);

  const selectedFeatureId =
    valueNode?.type === NodeType.GetEntityFeature
      ? valueNode?.config.featureId ?? null
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
            nodeDef.type === NodeType.GetEntityFeature &&
            DataPathUtils.equals(
              nodeDef.config.entityDataPath,
              selectedEntityDataPath
            ) &&
            nodeDef.config.featureId === newFeatureId
          );
        });

        if (foundNode) {
          onChange({
            nodeId: foundNode.id,
            path: [],
            schema: foundNode.returnSchema,
          });
        } else {
          const newNode = buildNodeDef(NodeType.GetEntityFeature, {
            type: NodeType.GetEntityFeature,
            eventType: eventType,
            name: `Get Feature: ${feature.name}`,
            config: {
              entityDataPath: selectedEntityDataPath,
              featureId: newFeatureId,
              featureSchema: feature.schema,
            },
            returnSchema: feature?.schema,
          });

          createNodeDef(newNode)
            .then((newDef) => {
              onChange({
                nodeId: newDef.id,
                path: [],
                schema: newDef.returnSchema,
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

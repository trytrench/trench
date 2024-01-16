import { TSchema, TypeName, createDataType } from "event-processing";
import { api } from "../../utils/api";
import { SchemaTag } from "../SchemaTag";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";
import { FeaturePathItem } from "../../shared/types";

export function FeatureSelector(props: {
  baseEntityTypeId: string;
  desiredSchema: TSchema;
  value: FeaturePathItem[];
  onChange: (value: FeaturePathItem[]) => void;
}) {
  const { value, onChange, desiredSchema, baseEntityTypeId } = props;
  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const finalItem = value[value.length - 1]!;
  const desiredType = finalItem ? createDataType(desiredSchema) : null;
  const isValidSelection = desiredType
    ? desiredType.isSuperTypeOf(finalItem.schema)
    : false;
  return (
    <div className="flex flex-wrap">
      {isValidSelection ? (
        <div className="text-green-400">✅</div>
      ) : (
        <div className="text-red-400">❌</div>
      )}
      {value.map((item, index) => {
        const previousItemSchema = value[index - 1]?.schema;
        if (previousItemSchema && previousItemSchema.type !== TypeName.Entity) {
          return <div key={index}>should never happen</div>;
        }
        const prevEntityType =
          index === 0 ? baseEntityTypeId : previousItemSchema!.entityType;

        return (
          <SelectFeaturePathItem
            key={index}
            previousEntityTypeId={
              index === 0
                ? baseEntityTypeId
                : entityTypes?.find(
                    (entityType) => entityType.id === prevEntityType
                  )?.id ?? ""
            }
            value={item}
            onChange={(item) => {
              const newValue: FeaturePathItem[] = [];
              for (let i = 0; i < index; i++) {
                if (i < index) {
                  newValue.push(value[i]!);
                }
              }
              newValue.push(item);
              onChange(newValue);
            }}
            desiredSchema={desiredSchema}
          />
        );
      })}
      {!finalItem && (
        <SelectFeaturePathItem
          previousEntityTypeId={baseEntityTypeId}
          value={null}
          onChange={(item) => {
            onChange([...value, item]);
          }}
          desiredSchema={desiredSchema}
        />
      )}
      {finalItem?.schema.type === TypeName.Entity && (
        <SelectFeaturePathItem
          previousEntityTypeId={finalItem.schema.entityType}
          value={null}
          onChange={(item) => {
            onChange([...value, item]);
          }}
          desiredSchema={desiredSchema}
        />
      )}
    </div>
  );
}

function SelectFeaturePathItem(props: {
  previousEntityTypeId?: string;
  value: FeaturePathItem | null;
  onChange: (item: FeaturePathItem) => void;
  desiredSchema: TSchema;
}) {
  const { value, onChange, previousEntityTypeId, desiredSchema } = props;
  const { data: features } = api.features.list.useQuery({});

  return (
    <Select
      value={value?.featureId ?? ""}
      onValueChange={(val) => {
        const newFeature = features?.find((feature) => feature.id === val);
        if (newFeature) {
          onChange({ featureId: newFeature.id, schema: newFeature.schema });
        }
      }}
    >
      <SelectTrigger>
        {value ? (
          <RenderFeaturePathItem item={value} />
        ) : (
          <div className="text-gray-400">Select feature</div>
        )}
      </SelectTrigger>
      <SelectContent>
        {features
          ?.filter(
            (feature) =>
              feature.entityTypeId === previousEntityTypeId &&
              (feature.schema.type === TypeName.Entity ||
                createDataType(desiredSchema).isSuperTypeOf(feature.schema))
          )
          ?.map((feature) => (
            <SelectItem key={feature.id} value={feature.id}>
              <RenderFeaturePathItem
                item={{ featureId: feature.id, schema: feature.schema }}
              />
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

function RenderFeaturePathItem(props: { item: FeaturePathItem }) {
  const { item } = props;
  const { data: features } = api.features.list.useQuery({});

  const desiredFeature = features?.find(
    (feature) => feature.id === item.featureId
  );

  return (
    <div className="flex items-center gap-2">
      <div className="text-gray-400">{desiredFeature?.name}</div>
      <SchemaTag schema={item.schema} />
    </div>
  );
}

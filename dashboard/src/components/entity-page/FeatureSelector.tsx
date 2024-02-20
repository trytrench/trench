import { type TSchema, TypeName, createDataType } from "event-processing";
import { api } from "../../utils/api";
import { SchemaTag } from "../SchemaTag";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";
import { Button } from "../ui/button";

export function FeatureSelector(props: {
  baseEntityTypeId: string;
  desiredSchema?: TSchema;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const { value, onChange, desiredSchema, baseEntityTypeId } = props;
  const { data: entityTypes } = api.entityTypes.list.useQuery();
  const { data: allFeatures } = api.features.list.useQuery();

  const lastFeatureId = value[value.length - 1];
  const lastFeature = allFeatures?.find(
    (feature) => feature.id === lastFeatureId
  );
  const desiredType = desiredSchema ? createDataType(desiredSchema) : null;
  const isValidSelection = desiredType
    ? desiredType.isSuperTypeOf(lastFeature?.schema ?? { type: TypeName.Any })
    : false;
  return (
    <div className="flex flex-wrap">
      {/* <Button
        onClick={() => {
          onChange([]);
        }}
      >
        Clear
      </Button> */}
      {isValidSelection ? (
        <div className="text-green-400">✅</div>
      ) : (
        <div className="text-red-400">❌</div>
      )}
      {value.map((item, index) => {
        const previousFeatureId = value[index - 1];
        const previousFeature = allFeatures?.find(
          (feature) => feature.id === previousFeatureId
        );

        const prevFtSchema = previousFeature?.schema;

        const prevEntityType =
          index === 0
            ? baseEntityTypeId
            : prevFtSchema?.type === TypeName.Entity
            ? prevFtSchema.entityType
            : null;

        return (
          <SelectFeature
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
              const newValue: string[] = [];
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
      {!lastFeatureId && (
        <SelectFeature
          previousEntityTypeId={baseEntityTypeId}
          value={null}
          onChange={(item) => {
            onChange([...value, item]);
          }}
          desiredSchema={desiredSchema}
        />
      )}
      {lastFeature?.schema.type === TypeName.Entity && (
        <SelectFeature
          previousEntityTypeId={lastFeature.schema.entityType}
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

function SelectFeature(props: {
  previousEntityTypeId?: string;
  value: string | null;
  onChange: (item: string) => void;
  desiredSchema?: TSchema;
}) {
  const { value, onChange, previousEntityTypeId, desiredSchema } = props;
  const { data: features } = api.features.list.useQuery({});

  return (
    <Select
      value={value ?? ""}
      onValueChange={(val) => {
        onChange(val);
      }}
    >
      <SelectTrigger>
        {value ? (
          <RenderFeatureId id={value} />
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
                createDataType(
                  desiredSchema ?? {
                    type: TypeName.Any,
                  }
                ).isSuperTypeOf(feature.schema))
          )
          ?.map((feature) => (
            <SelectItem key={feature.id} value={feature.id}>
              <RenderFeatureId id={feature.id} />
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

function RenderFeatureId(props: { id: string }) {
  const { id } = props;
  const { data: features } = api.features.list.useQuery({});

  const desiredFeature = features?.find((feature) => feature.id === id);

  if (!desiredFeature) {
    return <div>Feature not found</div>;
  }
  return (
    <div className="flex items-center gap-2">
      <div className="text-gray-400">{desiredFeature.name}</div>
      <SchemaTag schema={desiredFeature.schema} />
    </div>
  );
}

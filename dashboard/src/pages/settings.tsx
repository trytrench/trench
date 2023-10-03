import {
  Card,
  List,
  ListItem,
  Select,
  SelectItem,
  Text,
  Title,
} from "@tremor/react";
import { useMemo, useState } from "react";
import { Navbar } from "~/components/Navbar";
import { api } from "~/utils/api";

const FeatureCard = ({ feature, dataType, onChange }) => {
  const { mutateAsync } = api.features.saveFeatureMetadata.useMutation();
  const [value, setValue] = useState(dataType);

  return (
    <div className="flex justify-between items-center py-1">
      <Text>{feature}</Text>
      <span>
        <Select
          className="mt-1"
          value={value}
          onChange={(value) => {
            setValue(value);
            mutateAsync({ id: feature, name: feature, dataType: value });
            onChange();
          }}
        >
          <SelectItem value="text">Text</SelectItem>
          <SelectItem value="number">Number</SelectItem>
          <SelectItem value="boolean">Boolean</SelectItem>
        </Select>
      </span>
    </div>
  );
};

const Page = () => {
  const { data: entityFeatures, isLoading: entityFeaturesLoading } =
    api.labels.getEntityFeatures.useQuery({
      //   entityType: type,
    });

  const {
    data: featureMetadata,
    isLoading: featureMetadataLoading,
    refetch,
  } = api.features.getFeatureMetadata.useQuery();

  const featureToMetadata = useMemo(
    () =>
      featureMetadata?.reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      }, {}),
    [featureMetadata]
  );

  return (
    <>
      <Navbar />
      <div className="p-8">
        <Title>Settings</Title>
        <div className="flex">
          <div className="w-96">
            <List>
              <ListItem>
                <span>Data model</span>
              </ListItem>
            </List>
          </div>
          <List className="w-1/3">
            {entityFeatures?.map((feature) => (
              <FeatureCard
                key={feature}
                feature={feature}
                dataType={featureToMetadata[feature]?.dataType ?? "text"}
                onChange={() => {
                  refetch();
                }}
              />
            ))}
          </List>
        </div>
      </div>
    </>
  );
};

export default Page;

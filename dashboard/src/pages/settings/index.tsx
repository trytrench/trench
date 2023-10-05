import {
  Card,
  Divider,
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
    api.labels.getEntityFeatures.useQuery({});

  const {
    data: featureMetadata,
    isLoading: featureMetadataLoading,
    refetch,
  } = api.features.getFeatureMetadata.useQuery();

  // const featureToMetadata = useMemo(
  //   () =>
  //     featureMetadata?.reduce((acc, curr) => {
  //       acc[curr.id] = curr;
  //       return acc;
  //     }, {}) ?? {},
  //   [featureMetadata]
  // );

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <div className="p-8 grow overflow-y-auto">
        <div className="max-w-[70rem] mx-auto">
          <Title className="text-2xl">Settings</Title>
          <Divider />
          <div className="flex mt-12 gap-4">
            <div className="w-[16rem] flex flex-col gap-2 text-gray-200">
              <Text className="font-bold text-lg">Data Model</Text>
              <Text className="text-lg">Cool settings</Text>
            </div>
            <div className="grow">
              <Title className="text-xl mb-1">Data Model</Title>
              <Text>Configure entity feature data types.</Text>
              <Divider />

              <div className="flex gap-4">
                <div className="w-[14rem]">
                  <Text className="font-bold mb-4">Entity Type</Text>
                </div>
                <div className="grow">
                  <Text className="font-bold mb-4">Format</Text>
                  <Card>
                    {/* <List className="">
                      {entityFeatures?.map((feature) => (
                        <FeatureCard
                          key={feature}
                          feature={feature}
                          dataType={
                            featureToMetadata[feature]?.dataType ?? "text"
                          }
                          onChange={() => {
                            refetch();
                          }}
                        />
                      ))}
                    </List> */}
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;

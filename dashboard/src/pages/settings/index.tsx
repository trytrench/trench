import { Divider, Text, Title } from "@tremor/react";
import { Navbar } from "~/components/Navbar";
import DataModelPage from "./DataModelPage";

const Page = () => {
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
              <Text className="text-lg">Super Secret Settings</Text>
            </div>
            <div className="grow">
              <DataModelPage />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;

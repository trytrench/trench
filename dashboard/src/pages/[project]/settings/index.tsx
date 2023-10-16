import AppLayout from "~/components/AppLayout";
import { type NextPageWithLayout } from "~/pages/_app";
import DataModelPage from "./DataModelPage";

const Page: NextPageWithLayout = () => {
  return (
    <div className="grow overflow-y-auto">
      <h1 className="text-2xl p-8 border-b text-emphasis-foreground">
        Settings
      </h1>
      <div className="max-w-[70rem] mx-auto">
        <div className="flex mt-12 gap-4">
          <div className="w-[16rem] flex flex-col gap-2 text-muted-foreground">
            <div className="font-semibold">Data Model</div>
            <div className="">Super Secret Settings</div>
          </div>
          <div className="grow">
            <DataModelPage />
          </div>
        </div>
      </div>
    </div>
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

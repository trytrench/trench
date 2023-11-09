import AppLayout from "~/components/AppLayout";
import { type NextPageWithLayout } from "~/pages/_app";
import DataModelPage from "./DataModelPage";
import { useRouter } from "next/router";
import { api } from "~/utils/api";

const Page: NextPageWithLayout = () => {
  const router = useRouter();

  const { data: project } = api.project.getByName.useQuery(
    { name: router.query.project as string },
    { enabled: !!router.query.project }
  );

  return (
    <div className="grow overflow-y-auto">
      {/* <h1 className="text-2xl p-8 border-b text-emphasis-foreground">
        Settings
      </h1> */}
      <div className="max-w-[72rem] mx-auto px-8">
        <div className="flex mt-12 gap-4">
          <div className="w-[16rem] flex flex-col gap-2 text-muted-foreground">
            <div className="font-semibold">Data Model</div>
            <div className="">Super Secret Settings</div>
          </div>
          <div className="grow">
            {project && <DataModelPage projectId={project.id} />}
          </div>
        </div>
      </div>
    </div>
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

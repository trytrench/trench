import { useRouter } from "next/router";
import SettingsLayout from "~/components/SettingsLayout";
import { type NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";

const items = [
  { title: "Features", path: "features" },
  { title: "Event types", path: "event-types" },
  { title: "Entity types", path: "entity-types" },
];

const Page: NextPageWithLayout = () => {
  const router = useRouter();

  const { data: project } = api.project.getByName.useQuery(
    { name: router.query.project as string },
    { enabled: !!router.query.project }
  );

  return <div className="grow overflow-y-auto"></div>;
};

Page.getLayout = (page) => <SettingsLayout>{page}</SettingsLayout>;

export default Page;

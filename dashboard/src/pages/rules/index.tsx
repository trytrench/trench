import { api } from "~/utils/api";
import { Navbar } from "~/components/Navbar";
import { RuleEditor } from "~/components/RuleEditor";

const Page = () => {
  const {
    data: files,
    refetch: refetchFiles,
    isLoading,
  } = api.files.list.useQuery();

  return (
    <div className="h-screen max-h-screen flex flex-col">
      <Navbar />
      {isLoading ? null : (
        <RuleEditor files={files} refetchFiles={refetchFiles} />
      )}
    </div>
  );
};

export default Page;

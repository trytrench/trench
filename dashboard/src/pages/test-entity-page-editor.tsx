import { EntityPageEditor } from "../components/entity-page/EntityPageEditor";
import { api } from "../utils/api";

const RenderJson = ({ data }: { data: any }) => {
  return (
    <div className="flex-grow">
      <pre className="whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default function Page() {
  const { data: eventTypes } = api.eventTypes.list.useQuery();
  return (
    <div className="">
      <EntityPageEditor />
    </div>
  );
}

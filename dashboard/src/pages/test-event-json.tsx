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
      {eventTypes?.map((et) => {
        return (
          <div className="flex flex-col gap-2" key={et.id}>
            <h2>{et.type}</h2>
            <RenderJson data={et.exampleEvent} />
          </div>
        );
      })}
    </div>
  );
}

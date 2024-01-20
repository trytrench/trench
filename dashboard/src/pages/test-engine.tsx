import { api } from "../utils/api";

export default function Page() {
  const { data: eventTypes } = api.eventTypes.list.useQuery();
  return <div className=""></div>;
}

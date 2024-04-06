import { RenderNodeDefs } from "../components/RenderNodeDefs";
import { api } from "../utils/api";

export default function Page() {
  const { data: engine } = api.editor.getLatestEngine.useQuery();

  return <RenderNodeDefs nodeDefs={engine?.nodeDefs ?? []} />;
}

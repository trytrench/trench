import { DataPath } from "event-processing";
import { api } from "../../utils/api";
import { selectors, useEditorStore } from "./editor/state/zustand";

export function RenderDataPath(props: { dataPath: DataPath }) {
  const { dataPath } = props;
  const nodes = useEditorStore(selectors.getNodeDefs());

  const node = nodes?.find((n) => n.id === dataPath.nodeId);
  return (
    <div className="flex items-center space-x-2 rounded-md border px-2 py-1">
      <div className="text-sm">{node?.name}</div>
      {dataPath.path.length > 0 && (
        <div className="text-sm">{dataPath.path.join(".")}</div>
      )}
    </div>
  );
}

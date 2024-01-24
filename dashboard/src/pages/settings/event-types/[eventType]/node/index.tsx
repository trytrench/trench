import type { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";
import { NodeType } from "event-processing";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import SettingsLayout from "~/components/SettingsLayout";
import { toast } from "~/components/ui/use-toast";
import { EditComputed } from "~/components/nodes/editor/EditComputed";
import { NodeEditorProps } from "../../../../../components/nodes/editor/types";
import { EditCounter } from "../../../../../components/nodes/editor/EditCounter";
import { EditDecision } from "~/components/nodes/editor/EditDecision";
import { EditUniqueCounter } from "~/components/nodes/editor/EditUniqueCounter";

const MAP_NODE_TYPE_TO_EDITOR: Partial<
  Record<NodeType, React.FC<NodeEditorProps>>
> = {
  [NodeType.Computed]: EditComputed,
  [NodeType.Counter]: EditCounter,
  [NodeType.UniqueCounter]: EditUniqueCounter,
  [NodeType.Decision]: EditDecision,
};

const Page: NextPageWithLayout = () => {
  const router = useRouter();

  const eventType = router.query.eventType as string;
  const nodeType = (router.query.type ?? NodeType.Computed) as NodeType;
  const NodeEditor = MAP_NODE_TYPE_TO_EDITOR[nodeType] ?? null;

  return (
    <div>
      <Link
        href={`/settings/event-types/${router.query.eventType as string}`}
        className="text-sm text-muted-foreground flex items-center gap-1"
      >
        <ChevronLeft className="w-3 h-3" />
        Back to {eventType}
      </Link>
      {NodeEditor ? (
        <NodeEditor />
      ) : (
        <div className="text-center text-muted-foreground">
          No editor for node type {nodeType}
        </div>
      )}
    </div>
  );
};

Page.getLayout = (page) => <SettingsLayout>{page}</SettingsLayout>;

export default Page;

import type { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";
import type { NodeDefsMap, NodeType } from "event-processing";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import SettingsLayout from "~/components/SettingsLayout";
import { EditNodeDef } from "~/components/features/EditNodeDef";
import { toast } from "~/components/ui/use-toast";

const Page: NextPageWithLayout = () => {
  const router = useRouter();

  const { data: eventType } = api.eventTypes.get.useQuery(
    { id: router.query.eventTypeId as string },
    { enabled: !!router.query.eventTypeId }
  );

  const { refetch: refetchNodes } = api.nodeDefs.list.useQuery(
    { eventTypeId: router.query.eventTypeId as string },
    { enabled: false }
  );

  const { data: nodeDef } = api.nodeDefs.get.useQuery(
    { id: router.query.nodeId as string },
    { enabled: !!router.query.nodeId }
  );

  const { mutateAsync: updateNodeDef } = api.nodeDefs.update.useMutation();

  function handleSave(def: NodeDefsMap[NodeType.Computed]) {
    updateNodeDef({
      ...def,
      dependsOn: [],
      eventTypes: [router.query.eventTypeId as string],
    })
      .then(() => {
        toast({
          title: "Node updated",
          // description: `${values.entity}`,
        });
        return refetchNodes();
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Failed to update node",
        });
      });
  }

  return (
    <div>
      <Link
        href={`/settings/event-types/${router.query.eventTypeId as string}`}
        className="text-sm text-muted-foreground flex items-center gap-1"
      >
        <ChevronLeft className="w-3 h-3" />
        Back to {eventType?.type}
      </Link>
      {nodeDef && <EditNodeDef initialNodeDef={nodeDef} onSave={handleSave} />}
    </div>
  );
};

Page.getLayout = (page) => <SettingsLayout>{page}</SettingsLayout>;

export default Page;
